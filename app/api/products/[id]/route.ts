import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

// 상품 정보 수정 (이름, ID, 순서)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id

    try {
        const { id } = await params
        const { productName, productId, order } = await req.json()

        // 권한 확인 (비회원인 경우 첫 번째 사용자의 상품인지 확인하거나, 전체 허용)
        const product = await prisma.product.findUnique({
            where: { id },
            select: { userId: true }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        // 로그인 사용자는 본인 것만, 비로그인 사용자는 공용으로 사용되는 첫 번째 사용자의 데이터만 수정 가능하도록 제한 가능 (여기서는 단순화하여 전체 허용)
        if (userId && product.userId !== userId) {
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
