import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'

type CategoryItem = { cid?: string; name?: string; catNm?: string }

function normalizeCategories(data: any): CategoryItem[] {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.list)) return data.list
    if (Array.isArray(data?.categories)) return data.categories
    if (Array.isArray(data?.result)) return data.result
    if (Array.isArray(data?.data)) return data.data
    return []
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const pid = searchParams.get('pid')
    if (!pid) {
        return NextResponse.json([])
    }

    const baseUrl = 'https://datalab.naver.com/shoppingInsight/getCategoryList.naver'
    const baseHeaders: Record<string, string> = {
        'Referer': 'https://datalab.naver.com/shoppingInsight/sCategory.naver',
        'Origin': 'https://datalab.naver.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    }

    // 네이버 데이터랩에서 사용하는 실제 요청 형식들 (여러 방식 시도)
    const attempts: Array<{ url: string; init: RequestInit; label: string }> = [
        {
            label: 'POST with cid (form-urlencoded)',
            url: baseUrl,
            init: {
                method: 'POST',
                headers: {
                    ...baseHeaders,
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                },
                body: `cid=${encodeURIComponent(pid)}`
            }
        },
        {
            label: 'POST with cid (URLSearchParams)',
            url: baseUrl,
            init: {
                method: 'POST',
                headers: {
                    ...baseHeaders,
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                },
                body: new URLSearchParams({ cid: pid }).toString()
            }
        },
        {
            label: 'GET with cid query param',
            url: `${baseUrl}?cid=${encodeURIComponent(pid)}`,
            init: {
                method: 'GET',
                headers: baseHeaders
            }
        },
    ]

    for (const attempt of attempts) {
        try {
            console.log(`[Categories API] Trying: ${attempt.label} for pid=${pid}`)
            const res = await fetch(attempt.url, {
                ...attempt.init,
                cache: 'no-store',
            })
            
            console.log(`[Categories API] Response status: ${res.status}`)
            
            if (!res.ok) {
                console.log(`[Categories API] Non-OK status, skipping`)
                continue
            }
            
            const text = await res.text()
            console.log(`[Categories API] Response length: ${text.length}, preview: ${text.substring(0, 200)}`)
            
            let data: any = null
            try {
                data = JSON.parse(text)
            } catch {
                console.log(`[Categories API] Failed to parse JSON`)
                data = null
            }
            if (!data) continue
            
            const list = normalizeCategories(data)
            if (list.length > 0) {
                console.log(`[Categories API] Success! Found ${list.length} subcategories`)
                // cid, catId 등 다양한 필드명 정규화
                const normalized = list.map((item: any) => ({
                    cid: String(item.cid || item.catId || item.id || ''),
                    name: item.name || item.catNm || item.catName || '',
                })).filter((item: any) => item.cid && item.name)
                
                return NextResponse.json(normalized)
            }
        } catch (error) {
            console.error(`[Categories API] Error in ${attempt.label}:`, error)
        }
    }

    console.log(`[Categories API] All attempts failed for pid=${pid}`)
    return NextResponse.json([])
}
