import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { searchProductRank } from '@/lib/naver-api'

// 캐싱 비활성화 - 로그인 여부에 관계없이 항상 최신 데이터 반환
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
    // 로그인하지 않은 경우에도 읽기 전용으로 데이터 제공
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')

    try {
        // 특정 상품의 순위 조회
        if (productId) {
            const product = await prisma.product.findFirst({
                where: { productId },
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
export async function POST(_req: Request) {
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

        // 공용 대시보드 기준으로 전체 상품 순위를 갱신한다.
        const products = await prisma.product.findMany({
            include: { keywords: true },
        })

        if (products.length === 0) {
            return NextResponse.json({ error: '등록된 상품이 없습니다' }, { status: 400 })
        }

        const rankTasks = products.flatMap((product) =>
            product.keywords.map((keyword) => ({
                productId: product.id,
                productNumber: product.productId,
                keyword: keyword.keyword,
            }))
        )

        const envConcurrency = Number.parseInt(process.env.RANK_REFRESH_CONCURRENCY || '4', 10)
        const concurrency = Number.isFinite(envConcurrency) && envConcurrency > 0
            ? Math.min(envConcurrency, 10)
            : 4
        const pageDelayMs = Math.max(
            0,
            Number.parseInt(process.env.RANK_PAGE_DELAY_MS || '30', 10) || 0
        )
        const now = new Date()
        const startedAt = Date.now()
        let pointer = 0
        let successCount = 0
        let failedCount = 0
        const rankWrites: { productId: string; keyword: string; rank: number }[] = []

        const worker = async () => {
            const localWrites: { productId: string; keyword: string; rank: number }[] = []
            let localSuccess = 0
            let localFailed = 0

            while (true) {
                const index = pointer++
                const task = rankTasks[index]
                if (!task) break

                try {
                    const rank = await searchProductRank(
                        task.keyword,
                        task.productNumber,
                        apiConfig.naverClientId,
                        apiConfig.naverClientSecret,
                        { pageDelayMs }
                    )

                    if (rank !== null) {
                        localWrites.push({
                            productId: task.productId,
                            keyword: task.keyword,
                            rank,
                        })
                        localSuccess++
                    } else {
                        localFailed++
                    }
                } catch (error) {
                    console.error(`[순위 갱신 에러] ${task.productNumber} - ${task.keyword}:`, error)
                    localFailed++
                }
            }

            rankWrites.push(...localWrites)
            successCount += localSuccess
            failedCount += localFailed
        }

        const workerCount = Math.max(1, Math.min(concurrency, rankTasks.length || 1))
        await Promise.all(Array.from({ length: workerCount }, () => worker()))

        if (rankWrites.length > 0) {
            const BATCH_SIZE = 200
            for (let i = 0; i < rankWrites.length; i += BATCH_SIZE) {
                const batch = rankWrites.slice(i, i + BATCH_SIZE)
                await prisma.rankHistory.createMany({
                    data: batch,
                })
            }
        }

        const updatedCount = rankTasks.length

        return NextResponse.json({
            success: true,
            message: `${products.length}개 상품, ${successCount}/${updatedCount}개 키워드 순위 갱신 완료`,
            totalTasks: rankTasks.length,
            successCount,
            failedCount,
            durationMs: Date.now() - startedAt,
            updatedAt: now.toISOString()
        })
    } catch (error) {
        console.error('Error refreshing ranks:', error)
        return NextResponse.json({ error: '순위 갱신 실패' }, { status: 500 })
    }
}
