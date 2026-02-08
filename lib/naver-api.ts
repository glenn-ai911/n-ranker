// 네이버 API 클라이언트 라이브러리

export async function searchProductRank(
    keyword: string,
    productId: string,
    clientId: string,
    clientSecret: string
): Promise<number | null> {
    try {
        const encodedKeyword = encodeURIComponent(keyword)
        const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodedKeyword}&display=100&sort=sim`

        const response = await fetch(url, {
            headers: {
                'X-Naver-Client-Id': clientId,
                'X-Naver-Client-Secret': clientSecret,
            },
        })

        if (!response.ok) {
            throw new Error(`Naver API error: ${response.status}`)
        }

        const data = await response.json()
        const items = data.items || []

        // 상품 ID로 순위 찾기
        const rank = items.findIndex((item: any) => item.productId === productId)

        return rank >= 0 ? rank + 1 : null
    } catch (error) {
        console.error('Error searching product rank:', error)
        return null
    }
}

export async function fetchDataLabTrend(
    keyword: string,
    startDate: string,
    endDate: string,
    clientId: string,
    clientSecret: string
): Promise<any> {
    try {
        const url = 'https://openapi.naver.com/v1/datalab/search'

        const body = {
            startDate,
            endDate,
            timeUnit: 'date',
            keywordGroups: [
                {
                    groupName: keyword,
                    keywords: [keyword],
                },
            ],
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-Naver-Client-Id': clientId,
                'X-Naver-Client-Secret': clientSecret,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            throw new Error(`DataLab API error: ${response.status}`)
        }

        const data = await response.json()
        return data.results?.[0]?.data || []
    } catch (error) {
        console.error('Error fetching DataLab trend:', error)
        return []
    }
}
