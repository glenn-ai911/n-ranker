import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { fetchShoppingCategoryTrend } from '@/lib/naver-api'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id

    try {
        const { categoryCid, startDate, endDate, timeUnit, device, gender, ages } = await req.json()

        if (!categoryCid) {
            return NextResponse.json({ error: 'Category CID is required' }, { status: 400 })
        }

        // API 설정 조회
        const apiConfig = await prisma.apiConfig.findUnique({
            where: { userId },
        })

        if (!apiConfig?.naverClientId || !apiConfig?.naverClientSecret) {
            return NextResponse.json({ error: 'API keys not configured' }, { status: 400 })
        }

        const clientId = apiConfig.naverClientId
        const clientSecret = apiConfig.naverClientSecret

        const data = await fetchShoppingCategoryTrend(
            categoryCid,
            startDate,
            endDate,
            timeUnit || 'date',
            device,
            gender,
            ages,
            clientId,
            clientSecret
        )

        return NextResponse.json({ results: data })

    } catch (error) {
        console.error('Error in shopping trends API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
