import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

// 키워드 추가
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params // Next.js 15+에서 params는 Promise
        const { keyword } = await req.json()

        if (!keyword) {
            return NextResponse.json({ error: 'Keyword is required' }, { status: 400 })
        }

        // 권한 확인
        const product = await prisma.product.findUnique({
            where: { id },
            select: { userId: true, id: true }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        if (product.userId !== (session.user as any).id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // 키워드 생성 (중복 방지)
        const existingKeyword = await prisma.keyword.findFirst({
            where: {
                productId: product.id,
                keyword
            }
        })

        if (existingKeyword) {
            return NextResponse.json({ error: 'Keyword already exists' }, { status: 409 })
        }

        const newKeyword = await prisma.keyword.create({
            data: {
                productId: product.id,
                keyword
            }
        })

        return NextResponse.json(newKeyword)
    } catch (error) {
        console.error('Error adding keyword:', error)
        return NextResponse.json({ error: 'Failed to add keyword' }, { status: 500 })
    }
}

// 키워드 삭제
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params // Next.js 15+에서 params는 Promise
        const { searchParams } = new URL(req.url)
        const keyword = searchParams.get('keyword')

        if (!keyword) {
            return NextResponse.json({ error: 'Keyword is required' }, { status: 400 })
        }

        // 권한 확인
        const product = await prisma.product.findUnique({
            where: { id },
            select: { userId: true }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        if (product.userId !== (session.user as any).id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // 키워드 삭제
        await prisma.keyword.deleteMany({
            where: {
                productId: id,
                keyword: keyword
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting keyword:', error)
        return NextResponse.json({ error: 'Failed to delete keyword' }, { status: 500 })
    }
}

// 키워드 순서 변경
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params
        const { keywordOrders } = await req.json() // [{ keyword: "키워드", order: 0 }, ...]

        if (!keywordOrders || !Array.isArray(keywordOrders)) {
            return NextResponse.json({ error: 'keywordOrders array is required' }, { status: 400 })
        }

        // 권한 확인
        const product = await prisma.product.findUnique({
            where: { id },
            select: { userId: true }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        if (product.userId !== (session.user as any).id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // 각 키워드의 order 업데이트
        await Promise.all(
            keywordOrders.map(({ keyword, order }: { keyword: string; order: number }) =>
                prisma.keyword.updateMany({
                    where: {
                        productId: id,
                        keyword
                    },
                    data: { order }
                })
            )
        )

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating keyword order:', error)
        return NextResponse.json({ error: 'Failed to update keyword order' }, { status: 500 })
    }
}
