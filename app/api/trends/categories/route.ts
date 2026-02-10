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

function getParentId(item: any): string | null {
    const keys = ['parentCid', 'parentId', 'pid', 'parentCategoryId', 'pCid', 'pId']
    for (const key of keys) {
        if (item?.[key] != null) return String(item[key])
    }
    return null
}

function normalizeItem(item: any) {
    const cid = String(item?.cid ?? item?.catId ?? item?.categoryId ?? item?.id ?? item?.categoryCid ?? '')
    const name = item?.catNm ?? item?.name ?? item?.categoryName ?? item?.value ?? ''
    return { cid, name }
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

    const url = `${baseUrl}?cid=${encodeURIComponent(pid)}`

    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: baseHeaders,
            cache: 'no-store',
        })

        if (!res.ok) {
            return NextResponse.json([])
        }

        const text = await res.text()
        let data: any = null
        try {
            data = JSON.parse(text)
        } catch {
            data = null
        }
        if (!data) return NextResponse.json([])

        let list = normalizeCategories(data)
        if (list.length === 0) return NextResponse.json([])

        const normalized = list.map(normalizeItem).filter((item: any) => item.cid && item.name)

        // parent 정보가 있으면 부모 기준으로 필터링
        const hasParent = list.some((item: any) => getParentId(item))
        if (hasParent) {
            const filtered = list
                .filter((item: any) => getParentId(item) === pid)
                .map(normalizeItem)
                .filter((item: any) => item.cid && item.name)
            return NextResponse.json(filtered)
        }

        return NextResponse.json(normalized)
    } catch (error) {
        console.error('Failed to fetch categories:', error)
    }

    return NextResponse.json([])
}
