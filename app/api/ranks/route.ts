import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)

    // 로그인하지 않은 경우에도 읽기 전용으로 데이터 제공
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const productId = searchParams.get('productId')

    try {
        // 특정 상품의 순위 조회
        if (productId) {
            const product = await prisma.product.findFirst({
                where: {
                    productId,
                    ...(userId ? { userId } : {})
                },
                include: {
                    keywords: true,
                    rankHistory: {
                        orderBy: { createdAt: 'desc' },
                        take: 100, // 최근 100개 (키워드별로 나눠짐)
                    },
                },
            })

            if (!product) {
                return NextResponse.json({ error: 'Product not found' }, { status: 404 })
            }

            // 키워드별 최신 순위 및 7일 히스토리 구성
            const keywordRanks = product.keywords.map(keyword => {
                // 해당 키워드의 순위 히스토리
                const history = product.rankHistory
                    .filter(h => h.keyword === keyword.keyword)
                    .slice(0, 7)
                    .reverse() // 오래된 것부터 정렬

                const latestRank = history[history.length - 1]
                const previousRank = history[history.length - 2]

                return {
                    keyword: keyword.keyword,
                    currentRank: latestRank?.rank || null,
                    previousRank: previousRank?.rank || null,
                    delta: latestRank?.rank != null && previousRank?.rank != null
                        ? previousRank.rank - latestRank.rank
                        : null,
                    history: history.map(h => ({
                        rank: h.rank,
                        date: h.createdAt,
                    })),
                }
            })

            return NextResponse.json({
                product: {
                    id: product.id,
                    productId: product.productId,
                    productName: product.productName,
                },
                ranks: keywordRanks,
            })
        }

        // 전체 상품의 최신 순위 조회
        const products = await prisma.product.findMany({
            where: userId ? { userId } : {},
            include: {
                keywords: true,
                rankHistory: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        })

        const result = products.map(product => {
            const keywordRanks = product.keywords.map(keyword => {
                const latestHistory = product.rankHistory.find(h => h.keyword === keyword.keyword)
                const allHistory = product.rankHistory
                    .filter(h => h.keyword === keyword.keyword)
                    .slice(0, 7)
                    .reverse()

                const previousRank = allHistory[allHistory.length - 2]

                return {
                    keyword: keyword.keyword,
                    currentRank: latestHistory?.rank || null,
                    delta: latestHistory?.rank != null && previousRank?.rank != null
                        ? previousRank.rank - latestHistory.rank
                        : null,
                    history: allHistory.map(h => ({
                        rank: h.rank,
                        date: h.createdAt,
                    })),
                }
            })

            return {
                id: product.id,
                productId: product.productId,
                productName: product.productName,
                keywords: keywordRanks,
            }
        })

        return NextResponse.json({ products: result })
    } catch (error) {
        console.error('Error fetching ranks:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// 네이버 쇼핑에서 상품 순위 조회
async function getNaverShoppingRank(
    keyword: string,
    productId: string,
    clientId: string,
    clientSecret: string
): Promise<number | null> {
    try {
        // 네이버 쇼핑 검색 API 호출
        const response = await fetch(
            `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(keyword)}&display=100&sort=sim`,
            {
                headers: {
                    'X-Naver-Client-Id': clientId,
                    'X-Naver-Client-Secret': clientSecret,
                },
            }
        )

        if (!response.ok) {
            console.error(`Naver API error: ${response.status}`)
            return null
        }

        const data = await response.json()
        const items = data.items || []

        // 상품 ID로 순위 찾기
        for (let i = 0; i < items.length; i++) {
            const item = items[i]
            // 네이버 쇼핑의 productId 또는 link에서 ID 추출하여 비교
            // link 형태: https://search.shopping.naver.com/gate.nhn?id=상품ID
            const link = item.link || ''
            const mallProductId = item.productId || ''

            if (link.includes(productId) || mallProductId === productId ||
                item.mallProductId === productId) {
                return i + 1 // 순위는 1부터 시작
            }
        }

        // 100위 내에 없으면 null 반환
        return null
    } catch (error) {
        console.error('Error fetching Naver shopping rank:', error)
        return null
    }
}

// 순위 갱신 (수동 트리거)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const userId = (session.user as any).id

        // API 설정 가져오기
        const apiConfig = await prisma.apiConfig.findUnique({
            where: { userId }
        })

        if (!apiConfig?.naverClientId || !apiConfig?.naverClientSecret) {
            return NextResponse.json({
                error: '네이버 API 키가 설정되지 않았습니다. 설정 메뉴에서 API 키를 입력해주세요.'
            }, { status: 400 })
        }

        // 해당 사용자의 모든 상품 조회
        const products = await prisma.product.findMany({
            where: { userId },
            include: { keywords: true }
        })

        if (products.length === 0) {
            return NextResponse.json({ error: '등록된 상품이 없습니다' }, { status: 400 })
        }

        const now = new Date()
        let updatedCount = 0
        let successCount = 0

        for (const product of products) {
            for (const keyword of product.keywords) {
                // 네이버 쇼핑 API로 실제 순위 조회
                const rank = await getNaverShoppingRank(
                    keyword.keyword,
                    product.productId,
                    apiConfig.naverClientId,
                    apiConfig.naverClientSecret
                )

                if (rank !== null) {
                    await prisma.rankHistory.create({
                        data: {
                            productId: product.id,
                            keyword: keyword.keyword,
                            rank,
                        }
                    })
                    successCount++
                }
                updatedCount++

                // API 호출 간 딜레이 (rate limit 방지)
                await new Promise(resolve => setTimeout(resolve, 100))
            }
        }

        return NextResponse.json({
            success: true,
            message: `${products.length}개 상품, ${successCount}/${updatedCount}개 키워드 순위 갱신 완료`,
            updatedAt: now.toISOString()
        })
    } catch (error) {
        console.error('Error refreshing ranks:', error)
        return NextResponse.json({ error: '순위 갱신 실패' }, { status: 500 })
    }
}
