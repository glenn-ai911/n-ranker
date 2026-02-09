import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id

    try {
        const config = await prisma.apiConfig.findUnique({
            where: { userId },
        })

        return NextResponse.json({
            naverClientId: config?.naverClientId || '',
            // 보안을 위해 Secret은 마스킹 처리하거나 빈 값으로 보냄 (수정 시에만 입력)
            naverClientSecret: config?.naverClientSecret ? '********' : '',
            hasSecret: !!config?.naverClientSecret
        })
    } catch (error) {
        console.error('Error fetching settings:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id

    try {
        const { naverClientId, naverClientSecret } = await req.json()

        // 유효성 검사 (간단하게)
        if (!naverClientId) {
            return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
        }

        // 업데이트 데이터 구성
        const data: any = {
            naverClientId,
            userId, // 연결을 위해 필요
        }

        // Secret이 제공된 경우에만 업데이트 (빈 값이면 기존 값 유지)
        if (naverClientSecret && naverClientSecret !== '********') {
            data.naverClientSecret = naverClientSecret
        }

        // upsert 사용 (있으면 업데이트, 없으면 생성)
        const config = await prisma.apiConfig.upsert({
            where: { userId },
            update: data,
            create: {
                userId,
                ...data,
                // Secret이 없을 경우 필수 필드 에러 방지 (스키마 확인 필요하지만 보통 optional이나 빈 문자열)
                naverClientSecret: data.naverClientSecret || ''
            },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error saving settings:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
