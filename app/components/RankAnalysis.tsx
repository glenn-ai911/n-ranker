// 순위 분석 페이지 컴포넌트
'use client'

import { useState, useMemo, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export function RankAnalysisContent({ ranksData, products }: { ranksData: any, products: any[] }) {
    const [period, setPeriod] = useState<7 | 30 | 90>(7)
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null)

    // 초기 선택 상품 설정
    useEffect(() => {
        if (!selectedProductId && products.length > 0) {
            setSelectedProductId(products[0].id)
        }
    }, [selectedProductId, products])

    // 선택된 상품 찾기
    const selectedProduct = products.find(p => p.id === selectedProductId)

    // 차트 데이터 가공 (선택된 상품만)
    const chartData = useMemo(() => {
        if (!ranksData?.products || !selectedProduct) return []

        const dataMap = new Map<string, Record<string, string | number | null>>()
        // DB id가 아닌 상품 productId로 매칭해야 함
        const targetProduct = ranksData.products.find((p: any) => p.productId === selectedProduct.productId)

        if (targetProduct) {
            targetProduct.keywords?.forEach((kw: any) => {
                kw.history?.forEach((h: any) => {
                    const dateObj = new Date(h.date)
                    if (Number.isNaN(dateObj.getTime())) return

                    // 로컬 날짜 기준으로 그룹핑
                    const year = dateObj.getFullYear()
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
                    const day = String(dateObj.getDate()).padStart(2, '0')
                    const dateKey = `${year}-${month}-${day}`
                    const dateLabel = dateObj.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })

                    if (!dataMap.has(dateKey)) {
                        dataMap.set(dateKey, { date: dateKey, dateLabel })
                    }
                    const entry = dataMap.get(dateKey)
                    if (!entry) return
                    entry[kw.keyword] = h.rank // 키워드명만 사용 (상품명 제외)
                })
            })
        }

        return Array.from(dataMap.values())
            .sort((a, b) => String(a.date).localeCompare(String(b.date)))
            .slice(-period)
    }, [ranksData, period, selectedProduct])

    const chartKeys = useMemo(() => {
        const keys = new Set<string>()
        for (const row of chartData) {
            for (const [key, value] of Object.entries(row)) {
                if (key === 'date' || key === 'dateLabel') continue
                if (typeof value === 'number') keys.add(key)
            }
        }
        return Array.from(keys)
    }, [chartData])

    // 통계 계산 (선택된 상품만)
    const stats = useMemo(() => {
        if (!ranksData?.products || !selectedProduct) return { avg: 0, best: 0, worst: 0, keywords: 0 }

        const ranks: number[] = []
        let keywordCount = 0
        // DB id가 아닌 상품 productId로 매칭해야 함
        const targetProduct = ranksData.products.find((p: any) => p.productId === selectedProduct.productId)

        if (targetProduct) {
            targetProduct.keywords?.forEach((kw: any) => {
                keywordCount++
                if (kw.currentRank != null && kw.currentRank > 0) ranks.push(kw.currentRank)
            })
        }

        return {
            avg: ranks.length > 0 ? Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length) : 0,
            best: ranks.length > 0 ? Math.min(...ranks) : 0,
            worst: ranks.length > 0 ? Math.max(...ranks) : 0,
            keywords: keywordCount
        }
    }, [ranksData, selectedProduct])

    const colors = ['#03c95c', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-[32px] font-black tracking-tight mb-2 text-[#0f172a]">
                        순위 분석 📊
                    </h2>
                    <p className="text-[#64748b] font-semibold text-lg">상품별 상세 키워드 순위 분석</p>
                </div>
                <div className="flex gap-2">
                    {[7, 30, 90].map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p as 7 | 30 | 90)}
                            className={`px-4 py-2 rounded-xl font-bold transition-all ${period === p
                                ? 'bg-[#03c95c] text-white shadow-lg shadow-[#03c95c]/30'
                                : 'bg-white text-[#64748b] hover:bg-[#f8fafc] border border-[#e2e8f0]'
                                }`}
                        >
                            {p}일
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex gap-6 items-start">
                {/* 왼쪽: 상품 목록 사이드바 */}
                <div className="w-[300px] shrink-0 bg-white rounded-3xl border border-[#e2e8f0] shadow-sm overflow-hidden sticky top-8">
                    <div className="p-6 border-b border-[#f1f5f9] bg-[#fafafa]">
                        <h3 className="font-black text-[#0f172a] text-lg">내 상품 목록</h3>
                        <p className="text-xs text-[#64748b] mt-1 font-medium">분석할 상품을 선택하세요</p>
                    </div>
                    <div className="p-3 max-h-[600px] overflow-y-auto custom-scrollbar space-y-2">
                        {products.map((product) => (
                            <button
                                key={product.id}
                                onClick={() => setSelectedProductId(product.id)}
                                className={`w-full text-left p-4 rounded-2xl transition-all group flex items-start gap-3 ${selectedProductId === product.id
                                    ? 'bg-[#e6f9ef] border border-[#03c95c]'
                                    : 'hover:bg-[#f8fafc] border border-transparent'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selectedProductId === product.id ? 'bg-[#03c95c] text-white' : 'bg-[#f1f5f9] text-[#94a3b8]'
                                    }`}>
                                    <span className="material-icons">inventory_2</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className={`font-bold truncate mb-1 ${selectedProductId === product.id ? 'text-[#0f172a]' : 'text-[#475569]'
                                        }`} title={product.productName}>
                                        {product.productName}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className={`px-2 py-0.5 rounded-md font-bold ${selectedProductId === product.id ? 'bg-white/50 text-[#03c95c]' : 'bg-[#f1f5f9] text-[#94a3b8]'
                                            }`}>
                                            키워드 {product.keywords.length}개
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 오른쪽: 상세 분석 영역 */}
                <div className="flex-1 space-y-6 min-w-0">
                    {/* 통계 카드 */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0] shadow-sm">
                            <div className="text-xs font-bold text-[#64748b] mb-1">평균 순위</div>
                            <div className="text-2xl font-black text-[#0f172a]">{stats.avg > 0 ? `${stats.avg}위` : '-'}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0] shadow-sm">
                            <div className="text-xs font-bold text-[#64748b] mb-1">최고 순위</div>
                            <div className="text-2xl font-black text-[#03c95c]">{stats.best > 0 ? `${stats.best}위` : '-'}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0] shadow-sm">
                            <div className="text-xs font-bold text-[#64748b] mb-1">최저 순위</div>
                            <div className="text-2xl font-black text-[#ff4d4d]">{stats.worst > 0 ? `${stats.worst}위` : '-'}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0] shadow-sm">
                            <div className="text-xs font-bold text-[#64748b] mb-1">분석 키워드</div>
                            <div className="text-2xl font-black text-[#0f172a]">{stats.keywords}개</div>
                        </div>
                    </div>

                    {/* 차트 */}
                    <div className="bg-white p-8 rounded-3xl border border-[#e2e8f0] shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-[#03c95c] rounded-full"></span>
                                {selectedProduct?.productName || '상품을 선택하세요'}
                            </h3>
                            {/* <div className="text-sm font-bold text-[#64748b]">최근 {period}일 데이터</div> */}
                        </div>

                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={450}>
                                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis
                                        dataKey="dateLabel"
                                        stroke="#94a3b8"
                                        style={{ fontSize: '12px', fontWeight: 'bold' }}
                                        tickLine={false}
                                        axisLine={false}
                                        dy={10}
                                    />
                                    <YAxis
                                        reversed
                                        stroke="#94a3b8"
                                        style={{ fontSize: '12px', fontWeight: 'bold' }}
                                        tickLine={false}
                                        axisLine={false}
                                        dx={-10}
                                        domain={[1, 'auto']}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: 'none',
                                            borderRadius: '16px',
                                            padding: '16px',
                                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                                        }}
                                        itemStyle={{ fontSize: '13px', fontWeight: 'bold', padding: '2px 0' }}
                                        labelStyle={{ color: '#64748b', marginBottom: '8px', fontWeight: 'bold' }}
                                    />
                                    <Legend
                                        wrapperStyle={{ paddingTop: '30px' }}
                                        iconType="circle"
                                        formatter={(value) => <span className="text-[#475569] font-bold text-sm ml-1">{value}</span>}
                                    />
                                    {chartKeys.map((key, i) => (
                                        <Line
                                            key={key}
                                            type="monotone"
                                            dataKey={key}
                                            connectNulls={false}
                                            stroke={colors[i % colors.length]}
                                            strokeWidth={3}
                                            dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                                            activeDot={{ r: 7, strokeWidth: 0 }}
                                            animationDuration={1000}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[400px] text-center bg-[#f8fafc] rounded-2xl border border-dashed border-[#cbd5e0]">
                                <span className="material-icons text-6xl text-[#cbd5e0] mb-4">analytics</span>
                                <p className="font-bold text-[#64748b] text-lg">데이터가 충분하지 않습니다</p>
                                <p className="text-sm text-[#94a3b8] mt-2">대시보드에서 순위를 갱신하거나 다른 기간을 선택해보세요</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
