'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { RankAnalysisContent } from './components/RankAnalysis'
import { MarketTrendContent } from './components/MarketTrend'
import { SettingsContent } from './components/Settings'
import { ProductCard } from './components/ProductCard'
import { SortableProductCard } from './components/SortableProductCard'
import { useTheme } from './context/ThemeContext'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    console.error(`[Fetcher] ${url} failed with status ${res.status}`)
    throw new Error(`API error: ${res.status}`)
  }
  const data = await res.json()
  return data
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedMenu, setSelectedMenu] = useState('대시보드')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  // 상품 데이터 및 순위 데이터 fetch
  const productsKey = status === 'loading'
    ? null
    : '/api/products'
  const { data: products, mutate, isValidating } = useSWR(productsKey, fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false
  })

  const ranksKey = status === 'loading'
    ? null
    : '/api/ranks'
  const { data: ranksData, mutate: mutateRanks } = useSWR(ranksKey, fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false
  })

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!isSidebarOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isSidebarOpen])

  // 로딩 중 표시
  if (status === 'loading') {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  // 비로그인 시 읽기 전용 모드 (로그인 시 편집 가능)
  const isReadOnly = !session?.user

  return (
    <div className={`flex min-h-screen overflow-x-hidden font-['Pretendard',sans-serif] ${theme === 'dark' ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'}`}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 h-full w-[280px] border-r transform transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${theme === 'dark' ? 'bg-[#1e293b] border-[#334155] shadow-[4px_0_24px_rgba(0,0,0,0.2)]' : 'bg-white border-[#e2e8f0] shadow-[4px_0_24px_rgba(0,0,0,0.02)]'}`}>
        <div className="flex h-full flex-col">
          <div className="p-8 pb-4">
            <button
              onClick={() => {
                setSelectedMenu('대시보드')
                setIsSidebarOpen(false)
              }}
              className="flex items-center gap-3 mb-1 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 bg-[#03c95c] rounded-xl flex items-center justify-center shadow-lg shadow-[#03c95c]/30">
                <span className="material-icons text-white text-2xl">bar_chart</span>
              </div>
              <h1 className={`text-2xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-[#0f172a]'}`}>RANKER</h1>
            </button>
            <p className="text-xs font-bold text-[#94a3b8] pl-1 tracking-wide">SMART ANALYTICS</p>
          </div>

          <nav className="px-4 mt-8 space-y-2 flex-1 overflow-y-auto pb-6">
            <MenuSection title="ANALYTICS" />
            <MenuItem
              icon="dashboard"
              label="대시보드"
              active={selectedMenu === '대시보드'}
              onClick={() => {
                setSelectedMenu('대시보드')
                setIsSidebarOpen(false)
              }}
            />
            <MenuItem
              icon="poll"
              label="순위 분석"
              active={selectedMenu === '순위 분석'}
              onClick={() => {
                setSelectedMenu('순위 분석')
                setIsSidebarOpen(false)
              }}
            />
            <MenuItem
              icon="trending_up"
              label="마켓 트렌드"
              active={selectedMenu === '마켓 트렌드'}
              onClick={() => {
                setSelectedMenu('마켓 트렌드')
                setIsSidebarOpen(false)
              }}
            />

            <div className={`my-6 border-t mx-4 ${theme === 'dark' ? 'border-[#334155]' : 'border-[#f1f5f9]'}`}></div>

            <MenuSection title="SYSTEM" />
            <MenuItem
              icon="settings"
              label="설정"
              active={selectedMenu === '설정'}
              onClick={() => {
                setSelectedMenu('설정')
                setIsSidebarOpen(false)
              }}
            />
          </nav>

          <div className={`w-full p-6 border-t ${theme === 'dark' ? 'border-[#334155]' : 'border-[#f1f5f9]'}`}>
            {/* 다크모드 토글 버튼 */}
            <button
              onClick={toggleTheme}
              className={`w-full mb-3 py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${theme === 'dark'
                ? 'bg-[#334155] text-yellow-400 hover:bg-[#475569]'
                : 'bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]'}`}
            >
              <span className="material-icons text-[18px]">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
              {theme === 'dark' ? '라이트 모드' : '다크 모드'}
            </button>

            {session?.user ? (
              <>
                <div className={`flex items-center gap-3 mb-4 p-3 rounded-2xl border ${theme === 'dark' ? 'bg-[#334155] border-[#475569]' : 'bg-[#f8fafc] border-[#e2e8f0]'}`}>
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xl font-bold text-[#03c95c] shadow-sm ${theme === 'dark' ? 'bg-[#1e293b] border-[#475569]' : 'bg-white border-[#e2e8f0]'}`}>
                    {session?.user?.name?.[0] || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-[#0f172a]'}`}>{session?.user?.email}</p>
                    <p className="text-xs text-[#64748b] font-medium">Free Plan</p>
                  </div>
                </div>
                <button
                  onClick={() => signOut()}
                  className={`w-full py-2.5 px-4 border rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 group ${theme === 'dark'
                    ? 'bg-[#334155] border-[#475569] text-[#94a3b8] hover:bg-[#475569] hover:text-white'
                    : 'bg-white border-[#e2e8f0] text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]'}`}
                >
                  <span className="material-icons text-[18px] group-hover:rotate-180 transition-transform duration-300">logout</span>
                  로그아웃
                </button>
              </>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="w-full py-3 px-4 bg-[#03c95c] hover:bg-[#02b350] text-white rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#03c95c]/30"
              >
                <span className="material-icons text-[18px]">login</span>
                로그인
              </button>
            )}
          </div>
        </div>
      </aside>

      {isSidebarOpen && (
        <button
          type="button"
          aria-label="사이드바 닫기"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <button
        type="button"
        aria-label="사이드바 열기"
        onClick={() => setIsSidebarOpen(true)}
        className={`fixed left-4 top-4 z-40 lg:hidden rounded-xl p-2.5 shadow-lg border transition-opacity ${isSidebarOpen ? 'opacity-0 pointer-events-none' : ''} ${theme === 'dark' ? 'bg-[#1e293b] border-[#334155] text-white' : 'bg-white border-[#e2e8f0] text-[#0f172a]'}`}
      >
        <span className="material-icons text-[22px]">menu</span>
      </button>

      {/* Main Content */}
      <main className={`flex-1 min-w-0 w-full max-w-[1500px] p-4 pt-20 sm:p-6 sm:pt-24 lg:ml-[280px] lg:p-12 lg:pt-12 ${isReadOnly ? 'mt-14' : ''}`}>
        {selectedMenu === '대시보드' ? (
          <DashboardContent
            isReadOnly={isReadOnly}
            products={products || []}
            ranksData={ranksData}
            isLoading={isValidating && !products}
            onMutate={() => {
              mutate()
              mutateRanks()
            }}
            onNavigateToRankAnalysis={() => {
              setSelectedMenu('순위 분석')
              setIsSidebarOpen(false)
            }}
          />
        ) : selectedMenu === '순위 분석' ? (
          <RankAnalysisContent ranksData={ranksData} products={products || []} />
        ) : selectedMenu === '마켓 트렌드' ? (
          <MarketTrendContent products={products || []} />
        ) : selectedMenu === '설정' ? (
          <SettingsContent />
        ) : (
          <div className="flex flex-col items-center justify-center h-[80vh] bg-white rounded-3xl border border-dashed border-[#e2e8f0]">
            <div className="w-20 h-20 bg-[#f1f5f9] rounded-full flex items-center justify-center mb-4">
              <span className="material-icons text-[#94a3b8] text-4xl">construction</span>
            </div>
            <p className="text-xl font-bold text-[#64748b]">{selectedMenu.toUpperCase()} 기능 개발 중입니다.</p>
            <button
              onClick={() => {
                setSelectedMenu('대시보드')
                setIsSidebarOpen(false)
              }}
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

function MenuSection({ title }: { title: string }) {
  return (
    <h3 className="px-4 text-[11px] font-black text-[#94a3b8] tracking-wider mb-2">{title}</h3>
  )
}

function MenuItem({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${active
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

function DashboardContent({ isReadOnly, products, ranksData, isLoading, onMutate, onNavigateToRankAnalysis }: {
  isReadOnly: boolean,
  products: any[],
  ranksData: any,
  isLoading: boolean,
  onMutate: () => void,
  onNavigateToRankAnalysis?: () => void
}) {
  const [newProductId, setNewProductId] = useState('')
  const [newProductName, setNewProductName] = useState('')
  const [newKeywords, setNewKeywords] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshSummary, setRefreshSummary] = useState('')

  // DnD sensors 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이동 후 드래그 시작
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 드래그 종료 시 order 업데이트
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const sortedProducts = [...products].sort((a, b) => (a.order || 0) - (b.order || 0))
    const oldIndex = sortedProducts.findIndex(p => p.id === active.id)
    const newIndex = sortedProducts.findIndex(p => p.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // 새로운 순서로 정렬된 배열 생성
    const newOrder = arrayMove(sortedProducts, oldIndex, newIndex)

    // 모든 상품의 order 값을 새 index로 업데이트
    try {
      await Promise.all(
        newOrder.map(async (product, index) => {
          const res = await fetch(`/api/products/${product.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: index })
          })
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}))
            throw new Error(errorData.error || `Failed to update order for ${product.id}`)
          }
        })
      )
      onMutate()
    } catch (error) {
      console.error('Drag reorder failed', error)
      alert('순서 변경 실패')
    }
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProductId || !newProductName || !newKeywords) {
      alert('모든 항목을 입력해주세요.')
      return
    }

    setIsAdding(true)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: newProductId,
          productName: newProductName,
          keywords: newKeywords.split(',').map((k) => k.trim()).filter(k => k.length > 0),
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to add product')
      }

      setNewProductId('')
      setNewProductName('')
      setNewKeywords('')
      alert('상품이 성공적으로 등록되었습니다!')
      onMutate()
    } catch (error: any) {
      console.error(error)
      alert(error.message || '상품 추가에 실패했습니다.')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('정말 이 상품을 삭제하시겠습니까? 모든 순위 기록도 함께 삭제됩니다.')) {
      return
    }

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        throw new Error('Failed to delete product')
      }

      onMutate()
    } catch (error: unknown) {
      console.error('Delete failed:', error)
      alert('상품 삭제에 실패했습니다.')
    }
  }

  // 상품 순서 변경 로직 (index 기반 order 할당)
  const handleReorder = async (productDbId: string, direction: 'up' | 'down') => {
    // products 배열이 order 기준으로 정렬되어 있다고 가정
    const sortedProducts = [...products].sort((a, b) => (a.order || 0) - (b.order || 0))
    const currentIndex = sortedProducts.findIndex(p => p.id === productDbId)

    if (currentIndex === -1) return
    if (direction === 'up' && currentIndex === 0) return
    if (direction === 'down' && currentIndex === sortedProducts.length - 1) return

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    const targetProduct = sortedProducts[targetIndex]
    const currentProduct = sortedProducts[currentIndex]

    // Index 기반으로 order 값 재할당 (swap 대신 새로운 index 값 부여)
    // 현재 상품에는 targetIndex를, target 상품에는 currentIndex를 할당
    try {
      const res1 = await fetch(`/api/products/${currentProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: targetIndex })
      })
      if (!res1.ok) {
        const errorData = await res1.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to update order for ${currentProduct.id}`)
      }

      const res2 = await fetch(`/api/products/${targetProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: currentIndex })
      })
      if (!res2.ok) {
        const errorData = await res2.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to update order for ${targetProduct.id}`)
      }

      onMutate()
    } catch (error) {
      console.error('Reorder failed', error)
      alert('순서 변경 실패')
    }
  }

  const handleRefreshRanks = async () => {
    setIsRefreshing(true)
    setRefreshSummary('순위 갱신 요청 중...')
    try {
      const startedAt = Date.now()
      const res = await fetch('/api/ranks', { method: 'POST' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Failed to refresh ranks')

      const durationMs = data?.durationMs ?? (Date.now() - startedAt)
      const successCount = data?.successCount ?? 0
      const failedCount = data?.failedCount ?? 0
      const totalTasks = data?.totalTasks ?? 0
      const elapsedText = `${(durationMs / 1000).toFixed(1)}초`
      const summary = `갱신 완료: ${successCount}/${totalTasks}개 성공, ${failedCount}개 실패, ${elapsedText}`
      setRefreshSummary(summary)
      alert(summary)
      onMutate()
    } catch (error) {
      console.error(error)
      setRefreshSummary('순위 갱신 실패')
      alert('순위 갱신 실패')
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0f172a] mb-2 tracking-tight">Dashboard</h2>
          <p className="text-[#64748b] font-medium">실시간 순위와 트렌드를 한눈에 확인하세요</p>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => {
              // Scroll to add form
              document.getElementById('add-product-form')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="w-full sm:w-auto px-6 py-3 bg-[#0f172a] text-white rounded-2xl font-bold hover:bg-[#1e293b] transition-all shadow-lg shadow-[#0f172a]/20 flex items-center justify-center gap-2 group"
          >
            <span className="material-icons group-hover:rotate-90 transition-transform">add</span>
            상품 등록하기
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="등록된 상품"
          value={products?.length || 0}
          unit="개"
          icon="inventory_2"
          iconColor="text-blue-500"
          bgColor="bg-blue-50"
        />
        <StatCard
          title="추적 키워드"
          value={products?.reduce((acc: number, p: any) => acc + (p.keywords?.length || 0), 0) || 0}
          unit="개"
          icon="tag"
          iconColor="text-purple-500"
          bgColor="bg-purple-50"
        />
        <StatCard
          title="순위 상승"
          value={ranksData?.products?.reduce((acc: number, p: any) => {
            return acc + (p.keywords?.filter((k: any) => (k.delta || 0) > 0).length || 0)
          }, 0) || 0}
          unit="개"
          icon="trending_up"
          iconColor="text-[#ff4d4d]" // Red for increase
          bgColor="bg-[#fff0f0]"
        />
        <StatCard
          title="순위 하락"
          value={ranksData?.products?.reduce((acc: number, p: any) => {
            return acc + (p.keywords?.filter((k: any) => (k.delta || 0) < 0).length || 0)
          }, 0) || 0}
          unit="개"
          icon="trending_down"
          iconColor="text-blue-500" // Blue for decrease
          bgColor="bg-blue-50"
        />
      </div>

      {/* Add Product Form */}
      {!isReadOnly && (
        <div id="add-product-form" className="bg-white p-4 sm:p-8 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] ring-1 ring-[#e2e8f0]">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-1.5 h-5 bg-[#0f172a] rounded-full"></span>
            <h3 className="text-lg font-black text-[#0f172a]">새 상품 등록</h3>
          </div>
          <form onSubmit={handleAddProduct} className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="상품명 (예: AOHi 140W 충전기)"
                  className="w-full px-5 py-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#03c95c]/20 focus:border-[#03c95c] transition-all font-bold placeholder:font-medium placeholder:text-[#94a3b8] text-[#0f172a]"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="네이버 상품 ID (숫자만 입력)"
                  className="w-full px-5 py-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#03c95c]/20 focus:border-[#03c95c] transition-all font-bold placeholder:font-medium placeholder:text-[#94a3b8] text-[#0f172a]"
                  value={newProductId}
                  onChange={(e) => setNewProductId(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="추적할 키워드 (쉼표로 구분, 예: 맥북충전기, 고속충전기)"
                className="flex-1 px-5 py-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#03c95c]/20 focus:border-[#03c95c] transition-all font-bold placeholder:font-medium placeholder:text-[#94a3b8] text-[#0f172a]"
                value={newKeywords}
                onChange={(e) => setNewKeywords(e.target.value)}
              />
              <button
                type="submit"
                disabled={isAdding}
                className="w-full sm:w-auto sm:px-8 py-3 sm:py-0 bg-[#03c95c] hover:bg-[#02b350] text-white rounded-2xl font-black shadow-lg shadow-[#03c95c]/30 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {isAdding ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-icons">add</span>
                    상품 추가
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Product Cards Grid */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <h3 className="text-[17px] font-black flex items-center gap-2 text-[#0f172a]">
            <span className="w-1.5 h-5 bg-[#03c95c] rounded-full"></span>
            실시간 순위 현황
          </h3>
          <button
            onClick={handleRefreshRanks}
            disabled={isRefreshing}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-[#03c95c] hover:bg-[#02b350] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#03c95c]/30 transition-all active:scale-95 disabled:opacity-50"
          >
            <span className={`material-icons text-lg ${isRefreshing ? 'animate-spin' : ''}`}>refresh</span>
            {isRefreshing ? '갱신 중...' : '전체 순위 갱신'}
          </button>
          {refreshSummary && (
            <p className="text-sm text-[#64748b] font-medium mt-2">
              {refreshSummary}
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-[#64748b] font-bold bg-white rounded-3xl ring-1 ring-[#e2e8f0]">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-[#e2e8f0] border-t-[#03c95c] rounded-full mb-4"></div>
            <p>데이터를 불러오는 중입니다...</p>
          </div>
        ) : (products?.length || 0) > 0 ? (
          isReadOnly ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...(products || [])]
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((product) => {
                  const productRanks = ranksData?.products?.find((p: any) => p.productId === product.productId)
                  return (
                    <ProductCard
                      key={product.id}
                      name={product.productName}
                      productId={product.productId}
                      productDbId={product.id}
                      isReadOnly={isReadOnly}
                      onDelete={handleDeleteProduct}
                      onUpdate={onMutate}
                      onProductClick={onNavigateToRankAnalysis}
                      order={product.order}
                      keywords={product.keywords?.map((kw: any) => {
                        const keywordRank = productRanks?.keywords?.find((k: any) => k.keyword === kw.keyword)
                        const rank = keywordRank?.currentRank
                        const delta = keywordRank?.delta
                        return {
                          keyword: kw.keyword,
                          rank: rank != null ? rank : null,
                          delta: delta != null ? delta : null,
                        }
                      }) || []}
                    />
                  )
                })}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={[...(products || [])].sort((a, b) => (a.order || 0) - (b.order || 0)).map(p => p.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...(products || [])]
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((product) => {
                      const productRanks = ranksData?.products?.find((p: any) => p.productId === product.productId)
                      return (
                        <SortableProductCard
                          key={product.id}
                          id={product.id}
                          name={product.productName}
                          productId={product.productId}
                          productDbId={product.id}
                          isReadOnly={isReadOnly}
                          onDelete={handleDeleteProduct}
                          onUpdate={onMutate}
                          onProductClick={onNavigateToRankAnalysis}
                          order={product.order}
                          keywords={product.keywords?.map((kw: any) => {
                            const keywordRank = productRanks?.keywords?.find((k: any) => k.keyword === kw.keyword)
                            const rank = keywordRank?.currentRank
                            const delta = keywordRank?.delta
                            return {
                              keyword: kw.keyword,
                              rank: rank != null ? rank : null,
                              delta: delta != null ? delta : null,
                            }
                          }) || []}
                        />
                      )
                    })}
                </div>
              </SortableContext>
            </DndContext>
          )
        ) : (
          <div className="p-16 text-center bg-white rounded-3xl ring-1 ring-[#e2e8f0]">
            <div className="w-20 h-20 bg-[#f1f5f9] rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-icons text-[#cbd5e0] text-4xl">inventory_2</span>
            </div>
            <p className="text-[#64748b] font-black text-lg mb-2">등록된 상품이 없습니다</p>
            <p className="text-[#94a3b8] font-medium">새로운 상품을 등록하여 순위 추적을 시작해보세요</p>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ title, value, unit, icon, iconColor = 'text-[#0f172a]', bgColor = 'bg-[#f8fafc]' }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] ring-1 ring-[#e2e8f0] hover:translate-y-[-2px] transition-transform duration-300">
      <div className="flex items-center gap-4">
        <div className={`p-3.5 rounded-2xl ${bgColor}`}>
          <span className={`material-icons ${iconColor} text-2xl`}>{icon}</span>
        </div>
        <div>
          <p className="text-[#64748b] text-[13px] font-bold mb-1">{title}</p>
          <div className="flex items-baseline gap-1">
            <h3 className="text-[28px] font-black text-[#0f172a] tracking-tight">{value}</h3>
            <span className="text-[#94a3b8] font-bold text-sm">{unit}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
