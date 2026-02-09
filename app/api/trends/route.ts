import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { fetchDataLabTrend } from '@/lib/naver-api'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id

    try {
        const { keywords, startDate, endDate } = await req.json()

        if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
            return NextResponse.json({ error: 'Keywords are required' }, { status: 400 })
        }

        // API 설정 조회
        const apiConfig = await prisma.apiConfig.findUnique({
            where: { userId },
        })

        if (!apiConfig?.naverClientId || !apiConfig?.naverClientSecret) {
            return NextResponse.json({ error: 'API keys not configured' }, { status: 400 })
        }

        const clientId = process.env.NAVER_CLIENT_ID || apiConfig.naverClientId
        const clientSecret = process.env.NAVER_CLIENT_SECRET || apiConfig.naverClientSecret

        // 네이버 DataLab API 호출 (여러 키워드를 한번에 요청하도록 수정 필요하지만, 
        // 현재 fetchDataLabTrend 함수가 단일 키워드용이므로 반복 호출로 처리 후 병합)

        // 주의: DataLab API는 하루 호출 제한이 있으므로 주의 필요
        const results = await Promise.all(
            keywords.map(async (kw) => {
                try {
                    const data = await fetchDataLabTrend(
                        [{ groupName: kw, keywords: [kw] }],
                        startDate,
                        endDate,
                        'date', // timeUnit
                        '', // device (all)
                        '', // gender (all)
                        [], // ages (all)
                        clientId,
                        clientSecret
                    )
                    return { keyword: kw, data }
                } catch (e) {
                    console.error(`Error fetching trend for ${kw}:`, e)
                    return { keyword: kw, data: [] }
                }
            })
        )

        // 차트 데이터 포맷으로 변환
        // [{ date: '2023-01-01', keyword1: 50, keyword2: 30 }, ...]
        const chartDataMap = new Map()

        results.forEach(({ keyword, data }) => {
            data.forEach((item: any) => {
                const date = item.period
                if (!chartDataMap.has(date)) {
                    chartDataMap.set(date, { date })
                }
                const entry = chartDataMap.get(date)
                entry[keyword] = item.ratio // 검색량 비율 (0-100)
            })
        })

        const chartData = Array.from(chartDataMap.values()).sort((a, b) => a.date.localeCompare(b.date))

        // 인사이트 생성 (간단한 로직)
        const insights: string[] = []
        results.forEach(({ keyword, data }) => {
            if (data.length > 1) {
                const first = data[0].ratio
                const last = data[data.length - 1].ratio
                const change = last - first
                if (change > 20) {
                    insights.push(`'${keyword}' 검색량이 기간 동안 급상승했습니다. (▴${change.toFixed(1)})`)
                } else if (change < -20) {
                    insights.push(`'${keyword}' 검색 관심도가 하락세입니다. (▾${Math.abs(change).toFixed(1)})`)
                }

                // 최고점 확인
                const max = Math.max(...data.map((d: any) => d.ratio))
                if (last === max && max > 80) {
                    insights.push(`'${keyword}' 검색량이 현재 최고 수준입니다.`)
                }
            }
        })

        return NextResponse.json({
            chartData,
            insights
        })

    } catch (error) {
        console.error('Error in trends API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
