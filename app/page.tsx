'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())


export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedMenu, setSelectedMenu] = useState('대시보드')

  // 로그인 여부 확인 (로그인하지 않아도 페이지 접근 가능)
  const isAuthenticated = !!session
  const isReadOnly = !isAuthenticated

  // 데이터 페칭 (SWR)
  const { data: products, mutate, isValidating } = useSWR('/api/products', fetcher, {
    refreshInterval: 60000, // 1분마다 갱신
  })


  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8f9fa]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#03c95c] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-bold text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#f8f9fa] text-[#1a202c]">
      {/* 읽기 전용 모드 알림 배너 */}
      {isReadOnly && (
        <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 text-center z-50 shadow-lg">
          <div className="flex items-center justify-center gap-3">
            <span className="material-icons">visibility</span>
            <span className="font-bold">읽기 전용 모드 - 데이터를 편집하려면 로그인이 필요합니다</span>
            <button
              onClick={() => router.push('/login')}
              className="ml-4 bg-white text-blue-600 px-4 py-1.5 rounded-full font-black text-sm hover:bg-blue-50 transition-all"
            >
              로그인하기
            </button>
          </div>
        </div>
      )}
      {/* Sidebar */}
      <aside className="w-[280px] bg-white border-r border-[#edf2f7] flex flex-col fixed h-full z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-8 pb-4">
          {/* Logo Section */}
          <div className="flex items-center gap-3.5 mb-12 px-2">
            <div className="w-12 h-12 bg-[#03c95c] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#03c95c]/20">
              <span className="material-icons text-2xl font-bold">query_stats</span>
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight leading-tight">N-Ranker</h1>
              <p className="text-[11px] text-[#94a3b8] font-bold uppercase tracking-wider">Rank Tracker SaaS</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            <NavItem
              icon="grid_view"
              label="대시보드"
              active={selectedMenu === '대시보드'}
              onClick={() => setSelectedMenu('대시보드')}
            />
            <NavItem
              icon="bar_chart"
              label="순위 분석"
              active={selectedMenu === '순위 분석'}
              onClick={() => setSelectedMenu('순위 분석')}
            />
            <NavItem
              icon="trending_up"
              label="마켓 트렌드"
              active={selectedMenu === '마켓 트렌드'}
              onClick={() => setSelectedMenu('마켓 트렌드')}
            />
            <NavItem
              icon="settings"
              label="설정"
              active={selectedMenu === '설정'}
              onClick={() => router.push('/settings')}
            />
          </nav>
        </div>

        {/* User Profile */}
        {/* User Profile / Login Button */}
        <div className="mt-auto p-6">
          {isAuthenticated && session ? (
            <div className="bg-[#f8fafc] p-3 rounded-2xl border border-[#edf2f7] flex items-center gap-3">
              <div className="w-10 h-10 bg-[#ffedd5] rounded-full ring-2 ring-white overflow-hidden shrink-0">
                {session.user?.image ? (
                  <img src={session.user.image} alt="profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#03c95c] text-white font-bold">
                    {session.user?.name?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-[14px] font-bold truncate">{session.user?.name || '사용자'}</p>
                <p className="text-[11px] text-[#94a3b8] font-semibold truncate">{session.user?.email || ''}</p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-[#03c95c] hover:bg-[#02b350] text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-[#03c95c]/20 flex items-center justify-center gap-2"
            >
              <span className="material-icons">login</span>
              로그인
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 ml-[280px] p-12 max-w-[1500px] w-full ${isReadOnly ? 'mt-14' : ''}`}>
        {selectedMenu === '대시보드' ? (
          <DashboardContent
            isReadOnly={isReadOnly}
            products={products || []}
            isLoading={isValidating && !products}
            onMutate={mutate}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-[80vh] bg-white rounded-3xl border border-dashed border-[#e2e8f0]">
            <div className="w-20 h-20 bg-[#f1f5f9] rounded-full flex items-center justify-center mb-4">
              <span className="material-icons text-[#94a3b8] text-4xl">construction</span>
            </div>
            <p className="text-xl font-bold text-[#64748b]">{selectedMenu.toUpperCase()} 기능 개발 중입니다.</p>
            <button
              onClick={() => setSelectedMenu('대시보드')}
              className="mt-6 text-[#03c95c] font-bold hover:underline"
            >
              대시보드로 돌아가기
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

function NavItem({ icon, label, active, onClick }: { icon: string, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-[16px] transition-all duration-300 border-0 ${active
        ? 'bg-[#e6f9ef] text-[#03c95c] shadow-sm'
        : 'text-[#64748b] hover:bg-[#f8fafc] hover:text-[#1a202c]'
        }`}
    >
      <span className={`material-icons text-[24px] ${active ? 'text-[#03c95c]' : 'text-[#cbd5e0]'}`}>{icon}</span>
      <span className={`text-[15px] font-bold ${active ? 'tracking-tight' : 'font-semibold'}`}>{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 bg-[#03c95c] rounded-full"></div>}
    </button>
  )
}

function DashboardContent({ isReadOnly, products, isLoading, onMutate }: { isReadOnly: boolean, products: any[], isLoading: boolean, onMutate: () => void }) {
  const [newProductId, setNewProductId] = useState('')
  const [newKeywords, setNewKeywords] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleAddProduct = async () => {
    if (!newProductId.trim()) {
      alert('상품 ID를 입력해 주세요.')
      return
    }

    setIsAdding(true)
    try {
      // 1. 상품 생성
      const productRes = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: newProductId.trim(),
          productName: `신규 상품 (${newProductId})`,
        }),
      })

      if (!productRes.ok) throw new Error('상품 추가 실패')

      // 2. 키워드 생성
      if (newKeywords.trim()) {
        const keywordsArray = newKeywords.split(',').map(k => k.trim()).filter(Boolean)
        await fetch('/api/keywords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: newProductId.trim(),
            keywords: keywordsArray,
          }),
        })
      }

      alert('✅ 상품과 키워드가 성공적으로 추가되었습니다!')
      setNewProductId('')
      setNewKeywords('')
      onMutate()
    } catch (error) {
      console.error(error)
      alert('❌ 오류가 발생했습니다.')
    } finally {
      setIsAdding(false)
    }
  }

  const handleRefreshRanks = async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch('/api/ranks/refresh', { method: 'POST' })
      if (!res.ok) throw new Error('새로고침 실패')
      alert('✅ 모든 순위 조회가 완료되었습니다!')
      onMutate()
    } catch (error) {
      console.error(error)
      alert('❌ 순위 조회 중 오류가 발생했습니다.')
    } finally {
      setIsRefreshing(false)
    }
  }

  const totalKeywords = products.reduce((acc, p) => acc + (p.keywords?.length || 0), 0)

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-[32px] font-black tracking-tight mb-2 text-[#0f172a]">
            안녕하세요, 스토어 현황입니다. <span className="text-3xl ml-1">👋</span>
          </h2>
          <p className="text-[#64748b] font-semibold text-lg">오늘의 주요 키워드 순위 변동을 확인하세요.</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="bg-white px-5 py-2.5 rounded-2xl border border-[#e2e8f0] flex items-center gap-2.5 text-sm font-bold text-[#64748b] shadow-sm">
            <span className="material-icons text-[18px] text-[#cbd5e0]">calendar_today</span>
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
          </div>
          {!isReadOnly && (
            <button
              onClick={handleRefreshRanks}
              disabled={isRefreshing || products.length === 0}
              className={`flex items-center gap-2 px-4 py-2 bg-white border border-[#03c95c] text-[#03c95c] rounded-xl text-sm font-black hover:bg-[#e6f9ef] transition-all disabled:opacity-50`}
            >
              <span className={`material-icons text-[18px] ${isRefreshing ? 'animate-spin' : ''}`}>sync</span>
              전체 순위 갱신
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-7">
        <StatCard title="전체 상품 수" value={products.length.toString()} unit="개 상품 관리 중" icon="inventory_2" />
        <StatCard title="추적 키워드" value={totalKeywords.toString()} unit="개 키워드 모니터링 중" icon="vpn_key" />
        <StatCard title="순위 상승" value="-" unit="업데이트 준비 중" trend="up" icon="trending_up" />
        <StatCard title="순위 하락" value="-" unit="업데이트 준비 중" trend="down" icon="trending_down" />
      </div>

      {/* Search Bar Box */}
      <div className="bg-white p-8 rounded-[24px] border border-[#e2e8f0] shadow-sm flex items-center gap-6">
        <div className="flex-1 space-y-2.5">
          <label className="text-sm font-black text-[#0f172a] ml-1">새로운 상품 추적</label>
          <div className="relative group">
            <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-[#cbd5e0] group-focus-within:text-[#03c95c] transition-colors">shopping_bag</span>
            <input
              type="text"
              value={newProductId}
              onChange={(e) => setNewProductId(e.target.value)}
              disabled={isReadOnly || isAdding}
              placeholder={isReadOnly ? "로그인 후 상품을 추가할 수 있습니다" : "네이버 쇼핑 상품 ID 입력"}
              className={`w-full pl-12 pr-5 py-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl text-[15px] font-semibold outline-none transition-all ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'focus:ring-4 focus:ring-[#03c95c]/10 focus:border-[#03c95c]'
                }`}
            />
          </div>
        </div>
        <div className="flex-1 space-y-2.5">
          <label className="text-sm font-black text-[#0f172a] ml-1">추적 키워드</label>
          <div className="relative group">
            <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-[#cbd5e0] group-focus-within:text-[#03c95c] transition-colors">search</span>
            <input
              type="text"
              value={newKeywords}
              onChange={(e) => setNewKeywords(e.target.value)}
              disabled={isReadOnly || isAdding}
              placeholder={isReadOnly ? "로그인 후 키워드를 추가할 수 있습니다" : "예: 여름 반팔티, 린넨 셔츠 (쉼표로 구분)"}
              className={`w-full pl-12 pr-5 py-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl text-[15px] font-semibold outline-none transition-all ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'focus:ring-4 focus:ring-[#03c95c]/10 focus:border-[#03c95c]'
                }`}
            />
          </div>
        </div>
        {!isReadOnly && (
          <button
            onClick={handleAddProduct}
            disabled={isAdding}
            className="h-[58px] self-end px-8 bg-[#03c95c] hover:bg-[#02b350] text-white rounded-2xl font-black text-base shadow-lg shadow-[#03c95c]/20 transition-all flex items-center justify-center gap-2 group border-0 disabled:opacity-50"
          >
            <span className={`material-icons text-xl ${isAdding ? 'animate-spin' : 'group-hover:rotate-90'} transition-transform`}>
              {isAdding ? 'sync' : 'add_circle'}
            </span>
            {isAdding ? '추가 중...' : '상품 추가'}
          </button>
        )}
      </div>

      {/* Tables and Side Charts Grid */}
      <div className="grid grid-cols-3 gap-8 pb-10">
        <div className="col-span-2 bg-white rounded-[28px] border border-[#e2e8f0] shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-[#f8fafc] flex justify-between items-center">
            <h3 className="text-xl font-black text-[#0f172a]">실시간 키워드 순위</h3>
          </div>

          <div className="p-4 px-8 overflow-auto min-h-[400px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-20 gap-4">
                <div className="w-10 h-10 border-4 border-[#03c95c] border-t-transparent rounded-full animate-spin"></div>
                <p className="font-bold text-[#64748b]">데이터를 불러오고 있습니다...</p>
              </div>
            ) : products.length > 0 ? (
              <table className="w-full min-w-full">
                <thead>
                  <tr className="text-[12px] font-bold text-[#94a3b8] uppercase tracking-wider border-b border-[#f8fafc]">
                    <th className="py-4 text-left w-1/2">상품명 / 키워드</th>
                    <th className="py-4 text-center">현재 순위</th>
                    <th className="py-4 text-center">변동</th>
                    <th className="py-4 text-right pr-6">7일 추세</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <RankRow
                      key={product.id}
                      name={product.productName}
                      id={product.productId}
                      keywords={product.keywords?.length || 0}
                      subRows={product.keywords?.map((kw: any) => ({
                        label: kw.keyword,
                        rank: '-',
                        delta: '-',
                        trend: 'none'
                      }))}
                    />
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center p-20 gap-4 text-center">
                <div className="w-16 h-16 bg-[#f1f5f9] rounded-full flex items-center justify-center">
                  <span className="material-icons text-[#cbd5e0] text-3xl">inbox</span>
                </div>
                <div>
                  <p className="font-bold text-[#0f172a]">등록된 상품이 없습니다.</p>
                  <p className="text-sm text-[#64748b] mt-1">새로운 상품을 추가하여 추적을 시작하세요.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trend Sidebar (Col 1/3) */}
        <div className="flex flex-col gap-8">
          <div className="bg-white p-8 rounded-[28px] border border-[#e2e8f0] shadow-sm flex flex-col h-full ring-4 ring-transparent hover:ring-[#03c95c]/5 transition-all">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-[#0f172a]">쇼핑 카테고리 트렌드</h3>
              <button className="w-10 h-10 rounded-full hover:bg-gray-50 flex items-center justify-center transition-colors">
                <span className="material-icons text-[#cbd5e0] text-2xl">more_horiz</span>
              </button>
            </div>

            <div className="relative mb-10">
              <select className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl px-5 py-4 text-sm font-black appearance-none outline-none focus:ring-4 focus:ring-[#03c95c]/10 focus:border-[#03c95c] transition-all">
                <option>패션의류 &gt; 여성의류</option>
              </select>
              <span className="material-icons absolute right-5 top-1/2 -translate-y-1/2 text-[#cbd5e0] pointer-events-none">expand_more</span>
            </div>

            <div className="flex-1 flex flex-col justify-end">
              <div className="h-56 w-full relative group">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 400 200">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#03c95c" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#03c95c" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 160 L50 120 L100 140 L150 100 L200 120 L250 70 L300 90 L350 40 L400 30"
                    fill="url(#chartGradient)"
                  />
                  <path
                    d="M0 160 L50 120 L100 140 L150 100 L200 120 L250 70 L300 90 L350 40 L400 30"
                    fill="none"
                    stroke="#03c95c"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-lg"
                  />
                  <circle cx="350" cy="40" r="6" fill="#03c95c" stroke="white" strokeWidth="3" />
                  <foreignObject x="315" y="5" width="70" height="30">
                    <div className="bg-black text-white text-[11px] font-black px-2 py-1 rounded-full text-center shadow-lg">Top 5%</div>
                  </foreignObject>
                </svg>
                <div className="flex justify-between mt-6 text-[11px] font-black text-[#94a3b8] px-1">
                  <span>10/18</span>
                  <span>10/20</span>
                  <span>10/22</span>
                  <span>10/24</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#e6f0ff] p-7 rounded-[28px] border border-[#3b82f6]/10 flex items-start gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center shrink-0">
              <span className="material-icons text-blue-500 text-2xl">lightbulb</span>
            </div>
            <div>
              <h4 className="text-[15px] font-black text-blue-900 mb-1.5 leading-tight">순위 최적화 지능형 팁</h4>
              <p className="text-[13px] text-blue-800/80 font-bold leading-relaxed">
                현재 '반팔티' 키워드 경쟁도가 낮아지는 중입니다. 광고 입찰가를 소폭 조정해 보세요.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


function StatCard({ title, value, unit, icon, change, trend }: any) {
  const isUp = trend === 'up'
  return (
    <div className="bg-white p-7 rounded-[24px] border border-[#e2e8f0] shadow-sm flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-500 group">
      <div className="flex justify-between items-start">
        <span className="text-sm font-black text-[#64748b] group-hover:text-[#0f172a] transition-colors">{title}</span>
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${title === '전체 상품 수' ? 'bg-gray-50 text-gray-400' :
          title === '추적 키워드' ? 'bg-indigo-50 text-indigo-400' :
            title === '순위 상승' ? 'bg-[#fff1f2] text-[#ff4d4d]' :
              'bg-[#eff6ff] text-[#3b82f6]'
          }`}>
          <span className="material-icons text-[22px]">{icon}</span>
        </div>
      </div>
      <div className="mt-8">
        <div className="flex items-end gap-2.5">
          <h3 className="text-[34px] font-black leading-none tracking-tighter">{value}</h3>
          {change && (
            <div className={`mb-1 px-2.5 py-1 rounded-full text-[12px] font-black flex items-center ${isUp ? 'bg-[#fff1f2] text-[#ff4d4d]' : 'bg-[#eff6ff] text-[#3b82f6]'
              }`}>
              <span className="material-icons text-[16px]">{isUp ? 'arrow_drop_up' : 'arrow_drop_down'}</span>
              {change.replace('+', '').replace('-', '')}
            </div>
          )}
        </div>
        <p className="text-xs font-bold text-[#94a3b8] mt-2 tracking-wide uppercase">{unit}</p>
      </div>
    </div>
  )
}

function RankRow({ name, id, keywords, expanded = false, subRows = [] }: any) {
  return (
    <>
      <tr className={`hover:bg-[#f8fafc] transition-colors cursor-pointer group`}>
        <td className="py-6 pr-4">
          <div className="flex items-center gap-4">
            <span className={`material-icons text-xl transition-transform duration-300 ${expanded ? 'text-[#03c95c]' : 'text-[#cbd5e0] group-hover:text-[#94a3b8] -rotate-90'}`}>
              expand_more
            </span>
            <div className="w-14 h-14 bg-[#f1f5f9] rounded-2xl border border-[#e2e8f0] flex items-center justify-center shrink-0">
              <span className="material-icons text-[#cbd5e0] text-3xl">image</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <h4 className="font-black text-[15px] truncate">{name}</h4>
                <span className="bg-[#e6f9ef] text-[#03c95c] text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                  {keywords}K
                </span>
              </div>
              <p className="text-[12px] font-bold text-[#94a3b8]">Product ID: {id}</p>
            </div>
          </div>
        </td>
        <td className="py-6 text-center font-black text-[#cbd5e0]">-</td>
        <td className="py-6 text-center font-black text-[#cbd5e0]">-</td>
        <td className="py-6 text-right pr-6">
          <div className="flex justify-end gap-1 h-8 items-end">
            {[15, 30, 20, 45, 60, 40, 85].map((h, i) => (
              <div key={i} className={`w-2 rounded-t-[3px] transition-all duration-500 ${i === 6 ? 'bg-[#03c95c] h-full shadow-[0_-2px_6px_rgba(3,201,92,0.3)]' : 'bg-[#e2e8f0] hover:bg-[#cbd5e0]'}`} style={{ height: `${h}%` }}></div>
            ))}
          </div>
        </td>
      </tr>
      {expanded && subRows.map((row: any, i: number) => (
        <tr key={i} className="bg-[#fcfdfd]">
          <td className="py-4 pl-14 pr-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#03c95c] shadow-[0_0_8px_rgba(3,201,92,0.5)]"></div>
              <span className="text-[14px] font-black text-[#475569]">{row.label}</span>
            </div>
          </td>
          <td className="py-4 text-center">
            <div className="inline-flex items-center gap-1.5 font-black text-[14px]">
              {i === 0 && <span className="material-icons text-[#fbd38d] text-xl">emoji_events</span>}
              {row.rank}
            </div>
          </td>
          <td className="py-4 text-center">
            <div className={`inline-flex items-center gap-0.5 font-black text-xs ${row.trend === 'up' ? 'text-[#ff4d4d]' : row.trend === 'down' ? 'text-blue-500' : 'text-gray-400'
              }`}>
              {row.trend !== 'none' && (
                <span className="material-icons text-[18px]">{row.trend === 'up' ? 'arrow_drop_up' : 'arrow_drop_down'}</span>
              )}
              {row.delta.replace('+', '').replace('-', '')}
            </div>
          </td>
          <td className="py-4 text-right pr-6">
            <div className="flex justify-end gap-0.5 h-4 items-end">
              {[20, 40, 25, 50, 70, 55, 90].map((h, j) => (
                <div key={j} className={`w-1 rounded-t-[1px] ${j === 6 ? (row.trend === 'up' ? 'bg-[#03c95c]' : 'bg-blue-400') : 'bg-[#e2e8f0]'}`} style={{ height: `${h}%` }}></div>
              ))}
            </div>
          </td>
        </tr>
      ))}
    </>
  )
}
