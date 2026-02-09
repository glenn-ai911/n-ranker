import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { searchProductRank } from '@/lib/naver-api'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
    console.log('[순위 갱신] API 호출됨')

    const session = await getServerSession(authOptions)
    if (!session?.user) {
        console.log('[순위 갱신] 인증 실패')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    console.log('[순위 갱신] 사용자 ID:', userId)

    // API 설정 조회
    const apiConfig = await prisma.apiConfig.findUnique({
        where: { userId },
    })

    if (!apiConfig?.naverClientId || !apiConfig?.naverClientSecret) {
        console.log('[순위 갱신] API 키 미설정')
        return NextResponse.json({ error: 'API keys not configured' }, { status: 400 })
    }

    // DB에 저장된 API 키 사용 (환경 변수보다 우선)
    const clientId = apiConfig.naverClientId
    const clientSecret = apiConfig.naverClientSecret

    console.log('[순위 갱신] API 키 확인 - Client ID 길이:', clientId.length)

    // 모든 상품 및 키워드 조회
    const products = await prisma.product.findMany({
        where: { userId },
        include: { keywords: true },
    })

    console.log('[순위 갱신] 조회할 상품 수:', products.length)

    const results = []

    for (const product of products) {
        console.log(`[순위 갱신] 상품: ${product.productName} (ID: ${product.productId}), 키워드 ${product.keywords.length}개`)

        for (const keyword of product.keywords) {
            try {
                const rank = await searchProductRank(
                    keyword.keyword,
                    product.productId,
                    clientId,
                    clientSecret
                )

                await prisma.rankHistory.create({
                    data: {
                        productId: product.id,
                        keyword: keyword.keyword,
                        rank,
                    },
                })

                results.push({
                    productName: product.productName,
                    keyword: keyword.keyword,
                    rank,
                })

                console.log(`[순위 갱신] ${keyword.keyword}: ${rank !== null ? rank + '위' : '순위 없음'}`)
            } catch (error) {
                console.error(`[순위 갱신 에러] ${product.productName} - ${keyword.keyword}:`, error)
            }
        }
    }

    console.log('[순위 갱신] 완료 - 총', results.length, '개 조회')
    return NextResponse.json({ results, count: results.length })
}
