import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { searchProductRank } from '@/lib/naver-api'

// 캐싱 비활성화 - 로그인 여부에 관계없이 항상 최신 데이터 반환
export const dynamic = 'force-dynamic'
export const revalidate = 0

const DEFAULT_REFRESH_CONCURRENCY = 4
const MAX_REFRESH_CONCURRENCY = 10
const RANK_HISTORY_BATCH_SIZE = 500

type RankRefreshTask = {
    productDbId: string
    productId: string
    productName: string
    keyword: string
}

type RankRefreshResult = RankRefreshTask & {
    rank: number | null
    ok: boolean
}

function getRefreshConcurrency(): number {
    const parsed = Number(process.env.RANK_REFRESH_CONCURRENCY ?? DEFAULT_REFRESH_CONCURRENCY)
    if (!Number.isFinite(parsed)) return DEFAULT_REFRESH_CONCURRENCY

    const normalized = Math.floor(parsed)
    return Math.min(MAX_REFRESH_CONCURRENCY, Math.max(1, normalized))
}

async function runWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    const results = new Array<R>(items.length)
    let nextIndex = 0

    const runner = async () => {
        while (true) {
            const currentIndex = nextIndex++
            if (currentIndex >= items.length) break
            results[currentIndex] = await worker(items[currentIndex], currentIndex)
        }
    }

    const workers = Array.from(
        { length: Math.min(concurrency, items.length) },
        () => runner()
    )

    await Promise.all(workers)
    return results
}

async function insertRankHistoryBatch(rows: { productId: string, keyword: string, rank: number | null }[]) {
    for (let i = 0; i < rows.length; i += RANK_HISTORY_BATCH_SIZE) {
        await prisma.rankHistory.createMany({
            data: rows.slice(i, i + RANK_HISTORY_BATCH_SIZE),
        })
    }
}

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
            include: { keywords: true }
        })

        if (products.length === 0) {
            return NextResponse.json({ error: '등록된 상품이 없습니다' }, { status: 400 })
        }

        const tasks: RankRefreshTask[] = products.flatMap(product =>
            product.keywords.map(keyword => ({
                productDbId: product.id,
                productId: product.productId,
                productName: product.productName,
                keyword: keyword.keyword,
            }))
        )

        if (tasks.length === 0) {
            return NextResponse.json({ error: '등록된 키워드가 없습니다' }, { status: 400 })
        }

        const now = new Date()
        const startedAt = Date.now()
        const concurrency = getRefreshConcurrency()

        const results = await runWithConcurrency(tasks, concurrency, async (task): Promise<RankRefreshResult> => {
            try {
                const rank = await searchProductRank(
                    task.keyword,
                    task.productId,
                    apiConfig.naverClientId,
                    apiConfig.naverClientSecret
                )

                return { ...task, rank, ok: true }
            } catch (error) {
                console.error(`[순위 갱신 에러] ${task.productName} - ${task.keyword}:`, error)
                return { ...task, rank: null, ok: false }
            }
        })

        await insertRankHistoryBatch(
            results.map(result => ({
                productId: result.productDbId,
                keyword: result.keyword,
                rank: result.rank,
            }))
        )

        const updatedCount = results.length
        const successCount = results.filter(result => result.rank !== null).length
        const requestFailedCount = results.filter(result => !result.ok).length
        const notRankedCount = updatedCount - successCount
        const durationMs = Date.now() - startedAt

        return NextResponse.json({
            success: true,
            message: `${products.length}개 상품, ${updatedCount}개 키워드 갱신 완료 (순위 확인 ${successCount}개, 미노출 ${notRankedCount}개)`,
            totalTasks: updatedCount,
            successCount,
            failedCount: notRankedCount,
            durationMs,
            updatedAt: now.toISOString(),
            stats: {
                productCount: products.length,
                keywordCount: updatedCount,
                rankedCount: successCount,
                notFoundCount: notRankedCount,
                failedCount: requestFailedCount,
                concurrency,
            },
        })
    } catch (error) {
        console.error('Error refreshing ranks:', error)
        return NextResponse.json({ error: '순위 갱신 실패' }, { status: 500 })
    }
}
