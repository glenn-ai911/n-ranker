'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [clientId, setClientId] = useState('')
    const [clientSecret, setClientSecret] = useState('')
    const [loading, setLoading] = useState(false)
    const [hasConfig, setHasConfig] = useState(false)

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
        }
    }, [status, router])

    useEffect(() => {
        fetchConfig()
    }, [])

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/settings')
            const data = await res.json()
            setHasConfig(data.hasConfig)
        } catch (error) {
            console.error('Error fetching config:', error)
        }
    }

    const handleSave = async () => {
        if (!clientId.trim() || !clientSecret.trim()) {
            alert('모든 필드를 입력해 주세요.')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId, clientSecret }),
            })

            if (res.ok) {
                alert('✅ API 키가 안전하게 저장되었습니다!')
                setClientId('')
                setClientSecret('')
                fetchConfig()
            } else {
                const data = await res.json()
                alert(`❌ 저장 실패: ${data.error}`)
            }
        } catch (error) {
            console.error('Error saving config:', error)
            alert('❌ 에러가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    if (status === 'loading') {
        return <div className="flex items-center justify-center min-h-screen">로딩 중...</div>
    }

    return (
        <div className="min-h-screen bg-[#f8f9fa] p-12">
            <div className="max-w-4xl mx-auto">
                {/* 헤더 */}
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-[#0f172a] mb-2">설정</h1>
                        <p className="text-[#64748b] font-semibold text-lg">API 키 및 계정 관리</p>
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-2xl font-bold transition-all flex items-center gap-2"
                    >
                        <span className="material-icons">arrow_back</span>
                        대시보드로
                    </button>
                </div>

                {/* 계정 정보 */}
                <div className="bg-white p-8 rounded-3xl border border-[#e2e8f0] shadow-sm mb-8">
                    <h2 className="text-2xl font-black text-[#0f172a] mb-6">계정 정보</h2>
                    <div className="flex items-center gap-4 mb-6">
                        {session?.user?.image && (
                            <img src={session.user.image} alt="Profile" className="w-16 h-16 rounded-full" />
                        )}
                        <div>
                            <p className="text-lg font-bold">{session?.user?.name}</p>
                            <p className="text-sm text-[#64748b] font-semibold">{session?.user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-bold transition-all"
                    >
                        로그아웃
                    </button>
                </div>

                {/* API 키 설정 */}
                <div className="bg-white p-10 rounded-3xl border border-[#e2e8f0] shadow-sm">
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-[#0f172a] mb-2">네이버 API 설정</h2>
                            <p className="text-sm text-[#64748b] font-semibold">
                                네이버 개발자센터에서 발급받은 API 키를 입력하세요.
                            </p>
                        </div>
                        {hasConfig && (
                            <span className="px-4 py-2 bg-[#e6f9ef] text-[#03c95c] rounded-full text-sm font-black">
                                ✓ 설정 완료
                            </span>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-black text-[#0f172a] mb-3">Client ID</label>
                            <input
                                type="text"
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                className="w-full px-6 py-4 border-2 border-[#e2e8f0] rounded-2xl focus:ring-4 focus:ring-[#03c95c]/10 focus:border-[#03c95c] outline-none font-semibold"
                                placeholder="네이버 Client ID 입력"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-black text-[#0f172a] mb-3">Client Secret</label>
                            <input
                                type="password"
                                value={clientSecret}
                                onChange={(e) => setClientSecret(e.target.value)}
                                className="w-full px-6 py-4 border-2 border-[#e2e8f0] rounded-2xl focus:ring-4 focus:ring-[#03c95c]/10 focus:border-[#03c95c] outline-none font-semibold"
                                placeholder="네이버 Client Secret 입력"
                            />
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="w-full bg-[#03c95c] hover:bg-[#02b350] disabled:bg-gray-300 text-white font-black py-5 rounded-2xl transition-all shadow-lg shadow-[#03c95c]/20 hover:shadow-xl"
                        >
                            {loading ? '저장 중...' : '💾 안전하게 저장하기'}
                        </button>
                    </div>

                    <div className="mt-8 p-6 bg-[#f8fafc] rounded-2xl border border-[#e2e8f0]">
                        <p className="text-sm font-bold text-[#64748b] leading-relaxed">
                            <span className="material-icons text-blue-500 align-middle mr-2">info</span>
                            API 키는 암호화되어 안전하게 저장됩니다. <br className="md:hidden" />
                            <a
                                href="https://developers.naver.com/apps/#/register"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#03c95c] hover:underline font-black"
                            >
                                네이버 개발자 센터에서 API 키 발급받기 →
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
