import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { cid, startDate, endDate, timeUnit, device, gender, ages, limit } = await req.json()

        if (!cid) {
            return NextResponse.json({ error: 'Category CID is required' }, { status: 400 })
        }

        const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 500))
        const pageSize = 20
        const totalPages = Math.ceil(safeLimit / pageSize)

        // 네이버 데이터랩 내부 API 호출
        const url = 'https://datalab.naver.com/shoppingInsight/getCategoryKeywordRank.naver'

        const headers = {
            'Referer': 'https://datalab.naver.com/shoppingInsight/sCategory.naver',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest'
        }

        const allRanks: any[] = []
        let lastMeta: any = null

        for (let page = 1; page <= totalPages; page++) {
            const params = new URLSearchParams()
            params.append('cid', cid)
            params.append('timeUnit', timeUnit || 'date')
            params.append('startDate', startDate)
            params.append('endDate', endDate)
            params.append('page', String(page))
            params.append('count', String(pageSize))

            if (device) params.append('device', device)
            if (gender) params.append('gender', gender)
            if (ages && ages.length > 0) {
                ages.forEach((age: string) => params.append('age', age))
            }

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: params.toString()
            })

            if (!response.ok) {
                console.error(`[DataLab Keyword API Error] Status: ${response.status}`)
                return NextResponse.json({ error: `DataLab API error: ${response.status}` }, { status: response.status })
            }

            const data = await response.json()
            lastMeta = data
            const ranks = Array.isArray(data?.ranks) ? data.ranks : []
            allRanks.push(...ranks)

            if (ranks.length < pageSize) break
            if (allRanks.length >= safeLimit) break
        }

        return NextResponse.json({
            ...(lastMeta || {}),
            ranks: allRanks.slice(0, safeLimit),
        })

    } catch (error) {
        console.error('Error fetching keyword ranks:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
