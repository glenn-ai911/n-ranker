import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { fetchDataLabTrend } from '@/lib/naver-api'

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id

    try {
        const { keywordGroups, startDate, endDate, timeUnit, device, gender, ages } = await req.json()

        if (!keywordGroups || !Array.isArray(keywordGroups) || keywordGroups.length === 0) {
            return NextResponse.json({ error: 'Keyword groups are required' }, { status: 400 })
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

        const data = await fetchDataLabTrend(
            keywordGroups,
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
        console.error('Error in search trends API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
