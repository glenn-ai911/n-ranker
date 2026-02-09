import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { cid, startDate, endDate, timeUnit, device, gender, ages } = await req.json()

        if (!cid) {
            return NextResponse.json({ error: 'Category CID is required' }, { status: 400 })
        }

        // 네이버 데이터랩 내부 API 호출
        const url = 'https://datalab.naver.com/shoppingInsight/getCategoryKeywordRank.naver'

        // x-www-form-urlencoded 형식으로 데이터 변환
        const params = new URLSearchParams()
        params.append('cid', cid)
        params.append('timeUnit', timeUnit || 'date')
        params.append('startDate', startDate)
        params.append('endDate', endDate)

        if (device) params.append('device', device)
        if (gender) params.append('gender', gender)
        if (ages && ages.length > 0) {
            // ages가 배열인 경우 처리 (네이버 데이터랩은 콤마 구분 또는 여러 개의 age 파라미터일 수 있음)
            // 여기서는 일단 배열을 콤마로 합쳐서 보내거나 반복해서 보냄
            // 데이터랩 내부 로직: age=10&age=20 형태 예상
            ages.forEach((age: string) => params.append('age', age))
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Referer': 'https://datalab.naver.com/shoppingInsight/sCategory.naver',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: params.toString()
        })

        if (!response.ok) {
            console.error(`[DataLab Keyword API Error] Status: ${response.status}`)
            return NextResponse.json({ error: `DataLab API error: ${response.status}` }, { status: response.status })
        }

        // 응답 데이터 파싱 (JSON)
        const data = await response.json()

        // 데이터 구조 확인 및 가공
        // 예상 응답: { ranks: [ { rank: 1, keyword: '...' }, ... ] }
        return NextResponse.json(data)

    } catch (error) {
        console.error('Error fetching keyword ranks:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
