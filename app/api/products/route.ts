import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    // 읽기는 인증 없이도 허용 (public access)
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    // userId가 제공되면 해당 사용자의 상품만, 없으면 첫 번째 사용자의 상품 조회
    const products = await prisma.product.findMany({
        where: userId ? { userId } : undefined,
        include: {
            keywords: true,
            _count: {
                select: { rankHistory: true },
            },
        },
        orderBy: { regDate: 'desc' },
        take: userId ? undefined : 100, // userId 없으면 최대 100개
    })

    return NextResponse.json(products)
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const { productId, productName } = await req.json()

    if (!productId || !productName) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    try {
        const product = await prisma.product.create({
            data: {
                userId,
                productId,
                productName,
            },
            include: {
                keywords: true,
            },
        })

        return NextResponse.json(product)
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Product already exists' }, { status: 400 })
        }
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const { id } = await req.json()

    await prisma.product.delete({
        where: {
            id,
            userId, // 자신의 상품만 삭제 가능
        },
    })

    return NextResponse.json({ success: true })
}
