import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { searchProductRank } from '@/lib/naver-api'

// 캐싱 비활성화 - 로그인 여부에 관계없이 항상 최신 데이터 반환
export const dynamic = 'force-dynamic'
export const revalidate = 0

const DEFAULT_REFRESH_CONCURRENCY = 6
const MAX_REFRESH_CONCURRENCY = 10
const RANK_HISTORY_BATCH_SIZE = 500
const HISTORY_LOOKBACK_DAYS = 120
const MAX_HISTORY_ROWS_PER_PRODUCT = 2000
const MAX_DAILY_HISTORY_POINTS = 120

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

type KeywordHistoryRow = {
    keyword: string
    rank: number | null
    createdAt: Date
}

function getHistoryCutoffDate() {
    return new Date(Date.now() - HISTORY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
}

function toLocalDateKey(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function groupHistoryByKeyword(rows: KeywordHistoryRow[]): Map<string, KeywordHistoryRow[]> {
    const map = new Map<string, KeywordHistoryRow[]>()
    for (const row of rows) {
        const list = map.get(row.keyword)
        if (list) {
            list.push(row)
        } else {
            map.set(row.keyword, [row])
        }
    }
    return map
}

function buildDailyHistory(rows: KeywordHistoryRow[]) {
    const seen = new Set<string>()
    const daily: { rank: number | null, date: Date }[] = []

    for (const row of rows) {
        const key = toLocalDateKey(row.createdAt)
        if (seen.has(key)) continue

        seen.add(key)
        daily.push({
            rank: row.rank,
            date: row.createdAt,
        })

        if (daily.length >= MAX_DAILY_HISTORY_POINTS) break
    }

    return daily.reverse()
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
    const historyCutoffDate = getHistoryCutoffDate()

    try {
        // 특정 상품의 순위 조회
        if (productId) {
            const product = await prisma.product.findFirst({
                where: { productId },
                include: {
                    keywords: true,
                    rankHistory: {
                        where: {
                            createdAt: { gte: historyCutoffDate },
                        },
                        orderBy: { createdAt: 'desc' },
                        take: MAX_HISTORY_ROWS_PER_PRODUCT,
                    },
                },
            })

            if (!product) {
                return NextResponse.json({ error: 'Product not found' }, { status: 404 })
            }

            // 키워드별 최신 순위 및 7일 히스토리 구성
            const keywordHistoryMap = groupHistoryByKeyword(product.rankHistory)
            const keywordRanks = product.keywords.map(keyword => {
                const keywordHistory = keywordHistoryMap.get(keyword.keyword) || []
                const latestRank = keywordHistory[0]
                const previousRank = keywordHistory[1]
                const history = buildDailyHistory(keywordHistory)

                return {
                    keyword: keyword.keyword,
                    currentRank: latestRank?.rank ?? null,
                    previousRank: previousRank?.rank ?? null,
                    delta: latestRank?.rank != null && previousRank?.rank != null
                        ? previousRank.rank - latestRank.rank
                        : null,
                    history,
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
                    where: {
                        createdAt: { gte: historyCutoffDate },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: MAX_HISTORY_ROWS_PER_PRODUCT,
                },
            },
        })

        const result = products.map(product => {
            const keywordHistoryMap = groupHistoryByKeyword(product.rankHistory)
            const keywordRanks = product.keywords.map(keyword => {
                const keywordHistory = keywordHistoryMap.get(keyword.keyword) || []
                const latestHistory = keywordHistory[0]
                const previousRank = keywordHistory[1]
                const history = buildDailyHistory(keywordHistory)

                return {
                    keyword: keyword.keyword,
                    currentRank: latestHistory?.rank ?? null,
                    delta: latestHistory?.rank != null && previousRank?.rank != null
                        ? previousRank.rank - latestHistory.rank
                        : null,
                    history,
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
