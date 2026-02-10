import { NextResponse } from 'next/server'

// 네이버 데이터랩 카테고리 목록 조회 프록시
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const pid = searchParams.get('pid') || '0' // 상위 카테고리 ID (0이면 대분류)

    try {
        const url = `https://datalab.naver.com/shoppingInsight/getCategory.naver`

        const params = new URLSearchParams()
        params.append('cid', pid)

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
            console.error(`[Category API Error] Status: ${response.status}`)
            return NextResponse.json({ error: `API error: ${response.status}` }, { status: response.status })
        }

        const data = await response.json()
        return NextResponse.json(data)

    } catch (error) {
        console.error('Error fetching categories:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
