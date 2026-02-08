import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId, keywords } = await req.json()

    if (!productId || !Array.isArray(keywords) || keywords.length === 0) {
        return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    // 기존 키워드 삭제 후 새로 추가
    await prisma.keyword.deleteMany({
        where: { productId },
    })

    const created = await prisma.keyword.createMany({
        data: keywords.map((kw: string) => ({
            productId,
            keyword: kw.trim(),
        })),
    })

    return NextResponse.json({ success: true, count: created.count })
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await req.json()

    await prisma.keyword.delete({
        where: { id },
    })

    return NextResponse.json({ success: true })
}
