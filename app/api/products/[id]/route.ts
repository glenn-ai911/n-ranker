import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

// 상품 정보 수정 (이름, ID, 순서)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params // Next.js 15+에서 params는 Promise
        const { productName, productId, order } = await req.json()

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

        // 업데이트 수행
        const updatedProduct = await prisma.product.update({
            where: { id },
            data: {
                ...(productName && { productName }),
                ...(productId && { productId }),
                ...(order !== undefined && { order })
            }
        })

        return NextResponse.json(updatedProduct)
    } catch (error) {
        console.error('Error updating product:', error)
        return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
    }
}

// 상품 삭제
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params // Next.js 15+에서 params는 Promise

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

        await prisma.product.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting product:', error)
        return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
    }
}
