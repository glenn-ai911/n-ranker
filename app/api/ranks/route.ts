import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { searchProductRank } from '@/lib/naver-api'

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

// 순위 갱신 (수동 트리거) - 비회원도 사용 가능
export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id

    try {
        // API 설정 가져오기 (로그인 사용자 우선, 비로그인 시 첫 번째 설정 사용)
        let apiConfig
        if (userId) {
            apiConfig = await prisma.apiConfig.findUnique({
                where: { userId }
            })
        }
        if (!apiConfig) {
            // 비회원이거나 로그인 사용자에게 API 키가 없는 경우, 첫 번째 설정 사용
            apiConfig = await prisma.apiConfig.findFirst({
                where: {
                    naverClientId: { not: '' },
                    naverClientSecret: { not: '' }
                }
            })
        }

        if (!apiConfig?.naverClientId || !apiConfig?.naverClientSecret) {
            return NextResponse.json({
                error: '네이버 API 키가 설정되지 않았습니다. 설정 메뉴에서 API 키를 입력해주세요.'
            }, { status: 400 })
        }

        // 모든 상품 조회 (userId가 있으면 해당 사용자 상품, 없으면 전체)
        const products = await prisma.product.findMany({
            where: userId ? { userId } : {},
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
                // 1000위까지 조회 가능한 searchProductRank 사용
                const rank = await searchProductRank(
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
