// 네이버 API 클라이언트 라이브러리

type SearchProductRankOptions = {
    maxPages?: number
    displayCount?: number
    pageDelayMs?: number
}

export async function searchProductRank(
    keyword: string,
    productId: string,
    clientId: string,
    clientSecret: string,
    options: SearchProductRankOptions = {}
): Promise<number | null> {
    try {
        const encodedKeyword = encodeURIComponent(keyword)
        const targetId = String(productId)
        const maxPages = options.maxPages ?? 10
        const displayCount = options.displayCount ?? 100
        const pageDelayMs = options.pageDelayMs ?? 100

        console.log(`[순위 조회] 키워드: ${keyword}, 상품ID: ${productId}`)

        // 네이버 쇼핑 API는 start=1~1000, display=1~100 지원
        // 1000위까지 조회하려면 10번 페이징 필요
        for (let page = 0; page < maxPages; page++) {
            const start = page * displayCount + 1
            const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodedKeyword}&display=${displayCount}&start=${start}&sort=sim`

            const response = await fetch(url, {
                headers: {
                    'X-Naver-Client-Id': clientId,
                    'X-Naver-Client-Secret': clientSecret,
                },
            })

            if (!response.ok) {
                console.error(`[순위 조회 에러] API 응답 실패: ${response.status}`)
                throw new Error(`Naver API error: ${response.status}`)
            }

            const data = await response.json()
            const items = data.items || []

            console.log(`[순위 조회] 페이지 ${page + 1}, 시작: ${start}, 결과: ${items.length}개`)

            // 상품 ID로 순위 찾기 (productId, mallProductId, link URL 모두 확인)
            const indexInPage = items.findIndex((item: any) => {
                const itemProductId = String(item.productId || '')
                const itemMallProductId = String(item.mallProductId || '')

                // link URL에서 스마트스토어 상품 ID 추출 시도
                const linkMatch = item.link?.match(/\/products\/(\d+)/)
                const linkProductId = linkMatch ? linkMatch[1] : ''

                return itemProductId === targetId ||
                    itemMallProductId === targetId ||
                    linkProductId === targetId
            })

            if (indexInPage >= 0) {
                const actualRank = start + indexInPage
                const foundItem = items[indexInPage]
                console.log(`[순위 조회] 상품 발견! 순위: ${actualRank}위`)
                console.log(`[순위 조회] 매칭 정보 - productId: ${foundItem.productId}, mallProductId: ${foundItem.mallProductId || 'N/A'}`)
                return actualRank
            }

            // 결과가 100개 미만이면 더 이상 결과 없음
            if (items.length < displayCount) {
                console.log(`[순위 조회] 모든 결과 확인 완료 (총 ${start + items.length - 1}개)`)
                // 첫 페이지에서 못 찾았을 때 디버깅 정보 출력
                if (page === 0 && items.length > 0) {
                    console.log(`[순위 조회] 첫 상품 샘플 - productId: ${items[0].productId}, mallProductId: ${items[0].mallProductId || 'N/A'}`)
                }
                break
            }

            // API 호출 간격 (Rate limit 방지)
            await new Promise(resolve => setTimeout(resolve, pageDelayMs))
        }

        console.log(`[순위 조회] 상품을 1000위 안에서 찾을 수 없음`)
        return null
    } catch (error) {
        console.error('Error searching product rank:', error)
        return null
    }
}

// 통합 검색어 트렌드 (DataLab API)
export async function fetchDataLabTrend(
    keywordGroups: { groupName: string, keywords: string[] }[],
    startDate: string,
    endDate: string,
    timeUnit: 'date' | 'week' | 'month',
    device: string,
    gender: string,
    ages: string[] = [],
    clientId: string,
    clientSecret: string
): Promise<any> {
    try {
        const url = 'https://openapi.naver.com/v1/datalab/search'

        const body: any = {
            startDate,
            endDate,
            timeUnit,
            keywordGroups,
        }

        if (device) body.device = device
        if (gender) body.gender = gender
        if (ages && ages.length > 0) body.ages = ages

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
        return data.results || []
    } catch (error) {
        console.error('Error fetching DataLab trend:', error)
        return []
    }
}

// 쇼핑 인사이트 - 분야별 인기 검색어 (Top 10)
export async function fetchShoppingInsights(
    cid: string,
    startDate: string,
    endDate: string,
    timeUnit: 'date' | 'week' | 'month',
    clientId: string,
    clientSecret: string
): Promise<any> {
    try {
        // 분야별 인기 검색어 API는 POST 방식 사용
        // https://developers.naver.com/docs/serviceapi/datalab/shopping/shopping.md#%EC%87%BC%ED%95%91%EC%9D%B8%EC%82%AC%EC%9D%B4%ED%8A%B8-%EB%B6%84%EC%95%BC%EB%B3%84-%EC%9D%B8%EA%B8%B0-%EA%B2%80%EC%83%89%EC%96%B4

        // 주의: 이 API는 '쇼핑인사이트 > 분야별 인기 검색어' 기능을 제공하지 않음
        // '쇼핑인사이트 > 분야 통계'를 가져오는 API임.
        // 인기 검색어 순위 API는 제공되지 않으므로, '쇼핑 트렌드' API를 사용하여 카테고리 클릭 추이를 보여주거나
        // 크롤링/다른 방식이 필요함. 하지만 일단 사용자가 요청한 '쇼핑 인사이트'와 가장 유사한
        // '쇼핑 분야별 트렌드' 조회 기능을 구현.

        // 정정: 스크린샷은 '쇼핑인사이트 > 분야별 인기 검색어' 화면임.
        // 네이버 공식 문서상 '분야별 인기 검색어'를 조회하는 Open API는 제공되지 않음. (실시간 검색어도 폐지됨)
        // 따라서 Open API로는 '통합 검색어 트렌드'와 '쇼핑 카테고리별 클릭 트렌드'만 가능함.

        // 대안: 쇼핑 트렌드 (키워드/카테고리 클릭량 추이) API 사용
        // 혹은 쇼핑인사이트 웹페이지 크롤링(서버사이드)이 필요하나, 여기서는 공식 API인 '쇼핑 인사이트 - 분야내 키워드 통계' 사용
        // https://openapi.naver.com/v1/datalab/shopping/category/keywords (이것도 특정 키워드의 클릭량 추이임)

        // **결론**: 공식 Open API로는 'Top 10 인기 검색어 리스트'를 가져올 수 없음.
        // 하지만 사용자 요청을 만족시키기 위해, 사용자가 입력한 키워드들에 대한 쇼핑 클릭 트렌드를 보여주는 것으로 대체하거나
        // 통합 검색어 트렌드 기능을 강화하는 방향으로 가야 함.

        // 사용자가 요청한 "분야별 인기 검색어" 스크린샷은 네이버 데이터랩 웹사이트 화면임.
        // 이를 API로 구현할 수 없으므로, **"쇼핑 카테고리별 트렌드 조회"** 기능으로 구현하되,
        // UI에서 이를 명확히 안내해야 함.

        return []
    } catch (error) {
        console.error('Error fetching shopping insights:', error)
        return []
    }
}

// 쇼핑 카테고리별 트렌드 조회
export async function fetchShoppingCategoryTrend(
    categoryCid: string,
    startDate: string,
    endDate: string,
    timeUnit: 'date' | 'week' | 'month',
    device: string,
    gender: string,
    ages: string[],
    clientId: string,
    clientSecret: string
): Promise<any> {
    try {
        const url = 'https://openapi.naver.com/v1/datalab/shopping/categories';

        const body: any = {
            startDate,
            endDate,
            timeUnit,
            category: [
                {
                    name: "Category",
                    param: [categoryCid]
                }
            ]
        }

        if (device) body.device = device
        if (gender) body.gender = gender
        if (ages && ages.length > 0) body.ages = ages

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
            throw new Error(`Shopping Trends API error: ${response.status}`)
        }

        const data = await response.json()
        return data.results || []
    } catch (error) {
        console.error('Error fetching shopping category trend:', error)
        return []
    }
}
