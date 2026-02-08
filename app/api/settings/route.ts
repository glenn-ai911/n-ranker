import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// API 키 암호화 함수 (간단한 bcrypt 사용)
async function encrypt(text: string): Promise<string> {
    const salt = await bcrypt.genSalt(10)
    return bcrypt.hash(text, salt)
}

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id

    const apiConfig = await prisma.apiConfig.findUnique({
        where: { userId },
    })

    return NextResponse.json({
        hasConfig: !!apiConfig,
        clientId: apiConfig?.naverClientId ? '설정됨' : null,
    })
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const { clientId, clientSecret } = await req.json()

    if (!clientId || !clientSecret) {
        return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
    }

    // API 키를 암호화하여 저장 (실제로는 더 강력한 암호화 필요)
    const encryptedId = await encrypt(clientId)
    const encryptedSecret = await encrypt(clientSecret)

    await prisma.apiConfig.upsert({
        where: { userId },
        update: {
            naverClientId: encryptedId,
            naverClientSecret: encryptedSecret,
        },
        create: {
            userId,
            naverClientId: encryptedId,
            naverClientSecret: encryptedSecret,
        },
    })

    return NextResponse.json({ success: true })
}
