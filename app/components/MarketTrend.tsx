'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

// 네이버 쇼핑 카테고리 (대분류)
const SHOPPING_CATEGORIES = [
    { id: '50000000', name: '패션의류' },
    { id: '50000001', name: '패션잡화' },
    { id: '50000002', name: '화장품/미용' },
    { id: '50000003', name: '디지털/가전' },
    { id: '50000004', name: '가구/인테리어' },
    { id: '50000005', name: '출산/육아' },
    { id: '50000006', name: '식품' },
    { id: '50000007', name: '스포츠/레저' },
    { id: '50000008', name: '생활/건강' },
    { id: '50000009', name: '여가/생활편의' },
    { id: '50000010', name: '면세점' },
]

export function MarketTrendContent({ products }: { products: any[] }) {
    const [activeTab, setActiveTab] = useState<'shopping' | 'search'>('shopping')

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div>
                <h2 className="text-[32px] font-black tracking-tight mb-2 text-[#0f172a]">
                    마켓 트렌드 📈
                </h2>
                <p className="text-[#64748b] font-semibold text-lg">네이버 빅데이터로 시장 흐름을 파악하세요</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-[#e2e8f0]">
                <button
                    onClick={() => setActiveTab('shopping')}
                    className={`pb-4 px-2 font-black text-lg transition-all border-b-2 ${activeTab === 'shopping'
                        ? 'text-[#03c95c] border-[#03c95c]'
                        : 'text-[#94a3b8] border-transparent hover:text-[#64748b]'
                        }`}
                >
                    🛍️ 쇼핑 인사이트
                </button>
                <button
                    onClick={() => setActiveTab('search')}
                    className={`pb-4 px-2 font-black text-lg transition-all border-b-2 ${activeTab === 'search'
                        ? 'text-[#03c95c] border-[#03c95c]'
                        : 'text-[#94a3b8] border-transparent hover:text-[#64748b]'
                        }`}
                >
                    🔍 검색어 트렌드
                </button>
            </div>

            {activeTab === 'shopping' ? (
                <ShoppingTrendView />
            ) : (
                <SearchTrendView products={products} />
            )}
        </div>
    )
}

function ShoppingTrendView() {
    const [category1, setCategory1] = useState(SHOPPING_CATEGORIES[0].id)
    const [categories2, setCategories2] = useState<{ cid: string, name: string }[]>([])
    const [category2, setCategory2] = useState('')
    const [categories3, setCategories3] = useState<{ cid: string, name: string }[]>([])
    const [category3, setCategory3] = useState('')
    const [period, setPeriod] = useState('1month')
    const [loading, setLoading] = useState(false)
    const [trendData, setTrendData] = useState<any[]>([])
    const [topKeywords, setTopKeywords] = useState<any[]>([])
    const [loadingCat, setLoadingCat] = useState(false)

    // 하위 카테고리 가져오기
    const fetchSubCategories = async (parentId: string) => {
        try {
            setLoadingCat(true)
            const res = await fetch(`/api/trends/categories?pid=${parentId}`)
            const data = await res.json()
            if (Array.isArray(data)) {
                return data.map((item: any) => ({
                    cid: String(item.cid),
                    name: item.name || item.catNm || ''
                }))
            }
            return []
        } catch (error) {
            console.error('Failed to fetch subcategories:', error)
            return []
        } finally {
            setLoadingCat(false)
        }
    }

    // 1차 카테고리 변경 시
    const handleCategory1Change = async (value: string) => {
        setCategory1(value)
        setCategory2('')
        setCategory3('')
        setCategories3([])
        const subs = await fetchSubCategories(value)
        setCategories2(subs)
    }

    // 2차 카테고리 변경 시
    const handleCategory2Change = async (value: string) => {
        setCategory2(value)
        setCategory3('')
        if (value) {
            const subs = await fetchSubCategories(value)
            setCategories3(subs)
        } else {
            setCategories3([])
        }
    }

    // 최종 선택된 카테고리 CID
    const getSelectedCid = () => {
        if (category3) return category3
        if (category2) return category2
        return category1
    }

    const fetchTrends = async () => {
        setLoading(true)
        try {
            const endDate = new Date()
            const startDate = new Date()
            if (period === '1month') startDate.setMonth(endDate.getMonth() - 1)
            else if (period === '3month') startDate.setMonth(endDate.getMonth() - 3)
            else startDate.setFullYear(endDate.getFullYear() - 1)

            const selectedCid = getSelectedCid()

            // 1. 쇼핑 클릭 트렌드 조회
            const trendRes = await fetch('/api/trends/shopping', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    categoryCid: selectedCid,
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                    timeUnit: 'date'
                })
            })

            const trendJson = await trendRes.json()
            if (trendJson.results && trendJson.results[0]?.data) {
                setTrendData(trendJson.results[0].data)
            } else {
                setTrendData([])
            }

            // 2. 인기 검색어 Top 20 조회
            const keywordsRes = await fetch('/api/trends/keywords', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cid: selectedCid,
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                    timeUnit: 'date'
                })
            })

            const keywordsJson = await keywordsRes.json()
            if (keywordsJson && Array.isArray(keywordsJson)) {
                setTopKeywords(keywordsJson)
            } else if (keywordsJson.ranks) {
                setTopKeywords(keywordsJson.ranks)
            } else {
                setTopKeywords([])
            }

        } catch (error) {
            console.error(error)
            alert('데이터 조회 실패')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-[#e2e8f0] shadow-sm">
                <div className="flex flex-wrap gap-4 items-end">
                    {/* 1차 카테고리 */}
                    <div className="min-w-[160px]">
                        <label className="block text-sm font-bold text-[#64748b] mb-2">분야</label>
                        <select
                            value={category1}
                            onChange={(e) => handleCategory1Change(e.target.value)}
                            className="w-full px-4 py-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl font-bold text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#03c95c]/20"
                        >
                            {SHOPPING_CATEGORIES.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* 2차 카테고리 */}
                    <div className="min-w-[160px]">
                        <label className="block text-sm font-bold text-[#64748b] mb-2">
                            2차 분류 {loadingCat && <span className="text-xs text-[#94a3b8]">로딩...</span>}
                        </label>
                        <select
                            value={category2}
                            onChange={(e) => handleCategory2Change(e.target.value)}
                            disabled={categories2.length === 0}
                            className="w-full px-4 py-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl font-bold text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#03c95c]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="">전체</option>
                            {categories2.map(c => (
                                <option key={c.cid} value={c.cid}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* 3차 카테고리 */}
                    <div className="min-w-[160px]">
                        <label className="block text-sm font-bold text-[#64748b] mb-2">3차 분류</label>
                        <select
                            value={category3}
                            onChange={(e) => setCategory3(e.target.value)}
                            disabled={categories3.length === 0}
                            className="w-full px-4 py-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl font-bold text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#03c95c]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="">전체</option>
                            {categories3.map(c => (
                                <option key={c.cid} value={c.cid}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* 기간 */}
                    <div className="min-w-[200px]">
                        <label className="block text-sm font-bold text-[#64748b] mb-2">기간</label>
                        <div className="flex bg-[#f8fafc] p-1 rounded-xl border border-[#e2e8f0]">
                            {['1month', '3month', '1year'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${period === p ? 'bg-white text-[#0f172a] shadow-sm' : 'text-[#64748b] hover:text-[#0f172a]'
                                        }`}
                                >
                                    {p === '1month' ? '1개월' : p === '3month' ? '3개월' : '1년'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={fetchTrends}
                        disabled={loading}
                        className="px-8 py-3 bg-[#03c95c] hover:bg-[#02b350] text-white rounded-xl font-black shadow-lg shadow-[#03c95c]/30 transition-all active:scale-95 disabled:opacity-50 h-[50px] flex items-center gap-2"
                    >
                        {loading ? '조회 중...' : '트렌드 조회'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 쇼핑 클릭 트렌드 차트 */}
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-[#e2e8f0] shadow-sm">
                    <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                        <span className="material-icons text-[#03c95c]">show_chart</span>
                        쇼핑 클릭 트렌드
                    </h3>
                    {trendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="period" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                                <Line type="monotone" dataKey="ratio" stroke="#03c95c" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[400px] flex items-center justify-center text-[#94a3b8]">
                            데이터가 없습니다.
                        </div>
                    )}
                </div>

                {/* 인기 검색어 리스트 */}
                <div className="bg-white p-8 rounded-3xl border border-[#e2e8f0] shadow-sm">
                    <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                        <span className="material-icons text-[#f59e0b]">emoji_events</span>
                        인기 검색어 TOP 20
                    </h3>
                    <div className="space-y-3 h-[400px] overflow-y-auto custom-scrollbar">
                        {topKeywords.length > 0 ? (
                            topKeywords.map((item: any, index: number) => (
                                <div key={index} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#f8fafc] transition-colors group">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${index < 3 ? 'bg-[#ffedcc] text-[#f59e0b]' : 'bg-[#f1f5f9] text-[#64748b]'
                                        }`}>
                                        {item.rank || index + 1}
                                    </div>
                                    <span className="font-bold text-[#0f172a] flex-1">{item.keyword}</span>
                                    {/* 순위 변동 표시 (데이터가 있다면) */}
                                    {/* <span className="text-xs font-bold text-red-500">NEW</span> */}
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-[#94a3b8] gap-2">
                                <span className="material-icons text-4xl opacity-20">search_off</span>
                                <span>데이터가 없습니다.</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function SearchTrendView({ products }: { products: any[] }) {
    // 주제어 그룹 상태 (최대 5개)
    const [keywordGroups, setKeywordGroups] = useState<{ groupName: string, keywords: string[] }[]>([
        { groupName: '', keywords: [] }
    ])

    // 필터 상태
    const [period, setPeriod] = useState('1month')
    const [device, setDevice] = useState('') // '' | 'pc' | 'mo'
    const [gender, setGender] = useState('') // '' | 'm' | 'f'
    const [ages, setAges] = useState<string[]>([])

    const [loading, setLoading] = useState(false)
    const [chartData, setChartData] = useState<any[]>([])

    // 주제어 그룹 추가/삭제
    const addGroup = () => {
        if (keywordGroups.length < 5) {
            setKeywordGroups([...keywordGroups, { groupName: '', keywords: [] }])
        }
    }

    const removeGroup = (index: number) => {
        const newGroups = [...keywordGroups]
        newGroups.splice(index, 1)
        setKeywordGroups(newGroups)
    }

    const updateGroup = (index: number, field: 'groupName' | 'keywords', value: string) => {
        const newGroups = [...keywordGroups]
        if (field === 'keywords') {
            newGroups[index].keywords = value.split(',').map(k => k.trim())
        } else {
            newGroups[index].groupName = value
        }
        setKeywordGroups(newGroups)
    }

    const fetchTrends = async () => {
        // 유효성 검사
        const validGroups = keywordGroups.filter(g => g.groupName && g.keywords.length > 0)
        if (validGroups.length === 0) {
            alert('최소 1개 이상의 주제어 그룹을 입력해주세요')
            return
        }

        setLoading(true)
        try {
            const endDate = new Date()
            const startDate = new Date()
            if (period === '1month') startDate.setMonth(endDate.getMonth() - 1)
            else if (period === '3month') startDate.setMonth(endDate.getMonth() - 3)
            else startDate.setFullYear(endDate.getFullYear() - 1)

            const res = await fetch('/api/trends/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keywordGroups: validGroups,
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                    timeUnit: 'date',
                    device: device || undefined,
                    gender: gender || undefined,
                    ages: ages.length > 0 ? ages : undefined
                })
            })

            const json = await res.json()

            // 차트 데이터 변환
            if (json.results) {
                const dataMap = new Map()

                json.results.forEach((group: any) => {
                    group.data.forEach((item: any) => {
                        const date = item.period
                        if (!dataMap.has(date)) {
                            dataMap.set(date, { date })
                        }
                        dataMap.get(date)[group.title] = item.ratio
                    })
                })

                setChartData(Array.from(dataMap.values()).sort((a: any, b: any) => a.date.localeCompare(b.date)))
            }
        } catch (error) {
            console.error(error)
            alert('트렌드 조회 실패')
        } finally {
            setLoading(false)
        }
    }

    const colors = ['#03c95c', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

    return (
        <div className="space-y-6">
            {/* 검색 옵션 */}
            <div className="bg-white p-6 rounded-3xl border border-[#e2e8f0] shadow-sm space-y-6">
                {/* 주제어 입력 */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-[#64748b]">주제어 설정 (최대 5개)</label>
                        <button
                            onClick={addGroup}
                            disabled={keywordGroups.length >= 5}
                            className="text-sm font-bold text-[#03c95c] hover:bg-[#e6f9ef] px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                        >
                            + 주제어 추가
                        </button>
                    </div>

                    {keywordGroups.map((group, i) => (
                        <div key={i} className="flex gap-4 items-start">
                            <div className="w-[200px]">
                                <input
                                    type="text"
                                    placeholder={`주제어 ${i + 1}`}
                                    value={group.groupName}
                                    onChange={(e) => updateGroup(i, 'groupName', e.target.value)}
                                    className="w-full px-4 py-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl font-bold text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#03c95c]/20"
                                />
                            </div>
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="검색어 (쉼표로 구분, 예: 운동화, 런닝화, 스니커즈)"
                                    value={group.keywords.join(', ')}
                                    onChange={(e) => updateGroup(i, 'keywords', e.target.value)}
                                    className="w-full px-4 py-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl font-medium text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#03c95c]/20 placeholder:text-[#cbd5e0]"
                                />
                            </div>
                            {keywordGroups.length > 1 && (
                                <button
                                    onClick={() => removeGroup(i)}
                                    className="p-3 text-[#94a3b8] hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                >
                                    <span className="material-icons">close</span>
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <div className="h-px bg-[#f1f5f9]" />

                {/* 상세 필터 */}
                <div className="grid grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-[#64748b] mb-2">기간</label>
                        <div className="flex bg-[#f8fafc] p-1 rounded-xl border border-[#e2e8f0]">
                            {['1month', '3month', '1year'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${period === p ? 'bg-white text-[#0f172a] shadow-sm' : 'text-[#64748b] hover:text-[#0f172a]'
                                        }`}
                                >
                                    {p === '1month' ? '1개월' : p === '3month' ? '3개월' : '1년'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[#64748b] mb-2">기기</label>
                        <div className="flex bg-[#f8fafc] p-1 rounded-xl border border-[#e2e8f0]">
                            {[{ v: '', l: '전체' }, { v: 'pc', l: 'PC' }, { v: 'mo', l: '모바일' }].map(opt => (
                                <button
                                    key={opt.v}
                                    onClick={() => setDevice(opt.v)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${device === opt.v ? 'bg-white text-[#0f172a] shadow-sm' : 'text-[#64748b] hover:text-[#0f172a]'
                                        }`}
                                >
                                    {opt.l}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[#64748b] mb-2">성별</label>
                        <div className="flex bg-[#f8fafc] p-1 rounded-xl border border-[#e2e8f0]">
                            {[{ v: '', l: '전체' }, { v: 'm', l: '남성' }, { v: 'f', l: '여성' }].map(opt => (
                                <button
                                    key={opt.v}
                                    onClick={() => setGender(opt.v)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${gender === opt.v ? 'bg-white text-[#0f172a] shadow-sm' : 'text-[#64748b] hover:text-[#0f172a]'
                                        }`}
                                >
                                    {opt.l}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={fetchTrends}
                            disabled={loading}
                            className="w-full py-2.5 bg-[#03c95c] hover:bg-[#02b350] text-white rounded-xl font-black shadow-lg shadow-[#03c95c]/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? '조회 중...' : '트렌드 조회'}
                        </button>
                    </div>
                </div>
            </div>

            {/* 차트 */}
            {chartData.length > 0 && (
                <div className="bg-white p-8 rounded-3xl border border-[#e2e8f0] shadow-sm">
                    <h3 className="text-xl font-black mb-6">검색어 트렌드 추이</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                            <Legend />
                            {keywordGroups.filter(include => include.groupName && chartData[0]?.[include.groupName] !== undefined).map((group, i) => (
                                <Line
                                    key={group.groupName}
                                    type="monotone"
                                    dataKey={group.groupName}
                                    stroke={colors[i % colors.length]}
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    )
}
