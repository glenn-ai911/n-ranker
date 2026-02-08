import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { searchProductRank } from '@/lib/naver-api'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id

    // API 설정 조회
    const apiConfig = await prisma.apiConfig.findUnique({
        where: { userId },
    })

    if (!apiConfig?.naverClientId || !api Config?.naverClientSecret) {
        return NextResponse.json({ error: 'API keys not configured' }, { status: 400 })
    }

    // 실제로는 복호화가 필요하지만, 여기서는 간단하게 처리
    // 프로덕션에서는 적절한 암호화/복호화 라이브러리 사용 필요
    // 지금은 환경 변수로 대체
    const clientId = process.env.NAVER_CLIENT_ID || apiConfig.naverClientId
    const clientSecret = process.env.NAVER_CLIENT_SECRET || apiConfig.naverClientSecret

    // 모든 상품 및 키워드 조회
    const products = await prisma.product.findMany({
        where: { userId },
        include: { keywords: true },
    })

    const results = []

    for (const product of products) {
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
            } catch (error) {
                console.error(`Error fetching rank for ${product.productName} - ${keyword.keyword}`, error)
            }
        }
    }

    return NextResponse.json({ results, count: results.length })
}
