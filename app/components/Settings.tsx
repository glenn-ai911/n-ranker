'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function SettingsContent() {
    const { data: settings, mutate } = useSWR('/api/settings', fetcher)

    const [clientId, setClientId] = useState('')
    const [clientSecret, setClientSecret] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        if (settings) {
            setClientId(settings.naverClientId || '')
            // Secret 보안상 마스킹 처리 여부 확인 (hasSecret)
            setClientSecret(settings.hasSecret ? '********' : '')
        }
    }, [settings])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        setMessage(null)

        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    naverClientId: clientId,
                    naverClientSecret: clientSecret === '********' ? undefined : clientSecret
                })
            })

            if (!res.ok) throw new Error('설정 저장 실패')

            await mutate()
            setMessage({ type: 'success', text: '설정이 저장되었습니다.' })
            setTimeout(() => setMessage(null), 3000)
        } catch (error) {
            console.error(error)
            setMessage({ type: 'error', text: '저장 중 오류가 발생했습니다.' })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div>
                <h2 className="text-[32px] font-black tracking-tight mb-2 text-[#0f172a]">
                    설정 ⚙️
                </h2>
                <p className="text-[#64748b] font-semibold text-lg">환경 설정을 관리하세요</p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-[#e2e8f0] shadow-sm max-w-2xl">
                <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-[#03c95c] rounded-full"></span>
                    네이버 API 설정
                </h3>

                <div className="bg-blue-50 p-4 rounded-xl mb-6 text-sm text-blue-800 font-medium">
                    <p className="flex items-center gap-2 mb-1">
                        <span className="material-icons text-base">info</span>
                        네이버 개발자 센터에서 발급받은 키를 입력하세요.
                    </p>
                    <a href="https://developers.naver.com/apps/#/register" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-6 font-bold">
                        네이버 개발자 센터 바로가기 &rarr;
                    </a>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-[#64748b] mb-2">Client ID</label>
                        <input
                            type="text"
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            className="w-full px-4 py-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#03c95c]/20 focus:border-[#03c95c] transition-all font-bold text-[#0f172a]"
                            placeholder="Client ID 입력"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-[#64748b] mb-2">Client Secret</label>
                        <input
                            type="password"
                            value={clientSecret}
                            onChange={(e) => setClientSecret(e.target.value)}
                            className="w-full px-4 py-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#03c95c]/20 focus:border-[#03c95c] transition-all font-bold text-[#0f172a]"
                            placeholder="Client Secret 입력"
                        />
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl flex items-center gap-2 font-bold ${message.type === 'success' ? 'bg-[#e6f9ef] text-[#03c95c]' : 'bg-red-50 text-red-500'
                            }`}>
                            <span className="material-icons">{message.type === 'success' ? 'check_circle' : 'error'}</span>
                            {message.text}
                        </div>
                    )}

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-8 py-3 bg-[#03c95c] hover:bg-[#02b350] text-white rounded-xl font-black shadow-lg shadow-[#03c95c]/30 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSaving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span className="material-icons">save</span>
                                    저장
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
