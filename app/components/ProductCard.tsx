'use client'

import { useState, useEffect } from 'react'
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
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Keyword {
    keyword: string
    rank: number | null
    delta: number | null
}

interface ProductCardProps {
    name: string
    productId: string
    productDbId: string
    isReadOnly: boolean
    onDelete: (id: string) => void
    onUpdate: () => void
    onProductClick?: () => void
    keywords: Keyword[]
    order?: number
    onReorder?: (direction: 'up' | 'down') => void
    dragHandleProps?: any
}

// 드래그 가능한 키워드 아이템 컴포넌트
function SortableKeywordItem({ kw, index, isReadOnly, onDelete }: {
    kw: Keyword
    index: number
    isReadOnly: boolean
    onDelete: (keyword: string) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: kw.keyword })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : 'auto',
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center justify-between py-2 px-3 bg-[#f8fafc] dark:bg-[#334155] rounded-xl group/kw"
        >
            <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* 드래그 핸들 */}
                {!isReadOnly && (
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing text-[#cbd5e0] hover:text-[#94a3b8] shrink-0"
                        title="드래그하여 순서 변경"
                    >
                        <span className="material-icons text-[14px]">drag_indicator</span>
                    </div>
                )}
                <div className="w-1.5 h-1.5 rounded-full bg-[#03c95c] shrink-0"></div>
                <a
                    href={`https://search.shopping.naver.com/search/all?query=${encodeURIComponent(kw.keyword)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] font-bold text-[#475569] dark:text-[#cbd5e1] truncate hover:text-[#03c95c] hover:underline transition-colors"
                    title={`${kw.keyword} - 클릭하여 네이버 검색`}
                >
                    {kw.keyword}
                </a>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[12px] font-black ${kw.rank && kw.rank <= 10 ? 'text-[#03c95c]' : 'text-[#0f172a] dark:text-[#f1f5f9]'}`}>
                    {kw.rank != null ? `${kw.rank}위` : '-'}
                </span>
                {kw.delta != null && kw.delta !== 0 && (
                    <span className={`text-[10px] font-bold flex items-center ${kw.delta > 0 ? 'text-[#ff4d4d]' : 'text-blue-500'}`}>
                        <span className="material-icons text-[14px]">{kw.delta > 0 ? 'arrow_drop_up' : 'arrow_drop_down'}</span>
                        {Math.abs(kw.delta)}
                    </span>
                )}
                {!isReadOnly && (
                    <button
                        onClick={() => onDelete(kw.keyword)}
                        className="w-5 h-5 flex items-center justify-center text-[#cbd5e0] hover:text-red-500 hover:bg-white dark:hover:bg-[#475569] rounded-full transition-colors opacity-0 group-hover/kw:opacity-100 ml-1"
                        title="키워드 삭제"
                    >
                        <span className="material-icons text-[14px]">close</span>
                    </button>
                )}
            </div>
        </div>
    )
}

export function ProductCard({ name, productId, productDbId, isReadOnly, onDelete, onUpdate, onProductClick, keywords, order, onReorder, dragHandleProps }: ProductCardProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(name)
    const [editId, setEditId] = useState(productId)
    const [isSaving, setIsSaving] = useState(false)
    const [newKeyword, setNewKeyword] = useState('')
    const [isAddingKeyword, setIsAddingKeyword] = useState(false)
    const [localKeywords, setLocalKeywords] = useState(keywords)

    // props.keywords가 변경되면 localKeywords 동기화
    useEffect(() => {
        setLocalKeywords(keywords)
    }, [keywords])

    // DnD sensors 설정
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // 키워드 순서 변경
    const handleKeywordDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (!over || active.id === over.id) return

        const oldIndex = localKeywords.findIndex(kw => kw.keyword === active.id)
        const newIndex = localKeywords.findIndex(kw => kw.keyword === over.id)

        if (oldIndex === -1 || newIndex === -1) return

        const newOrder = arrayMove(localKeywords, oldIndex, newIndex)
        setLocalKeywords(newOrder)

        // 서버에 키워드 순서 저장
        try {
            await fetch(`/api/products/${productDbId}/keywords`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keywordOrders: newOrder.map((kw, index) => ({
                        keyword: kw.keyword,
                        order: index
                    }))
                })
            })
            onUpdate() // 부모 컴포넌트 데이터 갱신
        } catch (error) {
            console.error('Failed to save keyword order:', error)
        }
    }

    // 상품 정보 수정
    const handleSave = async () => {
        if (!editName || !editId) return
        setIsSaving(true)
        try {
            const res = await fetch(`/api/products/${productDbId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productName: editName,
                    productId: editId
                })
            })

            if (!res.ok) throw new Error('Failed to update')

            setIsEditing(false)
            onUpdate()
        } catch (error) {
            console.error(error)
            alert('수정 실패')
        } finally {
            setIsSaving(false)
        }
    }

    // 키워드 추가
    const handleAddKeyword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newKeyword.trim()) return

        setIsAddingKeyword(true)
        try {
            const res = await fetch(`/api/products/${productDbId}/keywords`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword: newKeyword.trim() })
            })

            if (res.ok) {
                setNewKeyword('')
                onUpdate()
            } else {
                const data = await res.json()
                alert(data.error || '키워드 추가 실패')
            }
        } catch (error) {
            console.error(error)
            alert('키워드 추가 중 오류 발생')
        } finally {
            setIsAddingKeyword(false)
        }
    }

    // 키워드 삭제
    const handleDeleteKeyword = async (keyword: string) => {
        if (!confirm(`'${keyword}' 키워드를 삭제하시겠습니까?`)) return

        try {
            const res = await fetch(`/api/products/${productDbId}/keywords?keyword=${encodeURIComponent(keyword)}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                onUpdate()
            } else {
                alert('키워드 삭제 실패')
            }
        } catch (error) {
            console.error(error)
            alert('키워드 삭제 중 오류 발생')
        }
    }

    // 표시할 키워드 (최대 4개)
    const displayKeywords = localKeywords.slice(0, 4)
    const remainingCount = localKeywords.length - 4

    return (
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-[#e2e8f0] dark:border-[#334155] shadow-sm hover:shadow-md transition-all p-5 group relative min-w-[280px] h-[380px] flex flex-col">
            {/* 드래그 핸들 (좌측 상단) */}
            {dragHandleProps && !isReadOnly && (
                <div
                    {...dragHandleProps}
                    className="absolute top-2 left-2 p-1.5 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-[#334155]/90 backdrop-blur-sm rounded-lg shadow-sm border border-[#e2e8f0] dark:border-[#475569] z-10"
                    title="드래그하여 이동"
                >
                    <span className="material-icons text-[#94a3b8] text-sm">drag_indicator</span>
                </div>
            )}

            {/* 기존 화살표 버튼 (드래그 핸들이 없을 때만 표시) */}
            {!dragHandleProps && onReorder && !isReadOnly && (
                <div className="absolute top-2 left-2 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-[#334155]/90 backdrop-blur-sm rounded-lg shadow-sm border border-[#e2e8f0] dark:border-[#475569] z-10">
                    <button
                        onClick={() => onReorder('up')}
                        className="p-1 hover:bg-[#f1f5f9] dark:hover:bg-[#475569] text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white rounded-t-lg transition-colors"
                        title="위로 이동"
                    >
                        <span className="material-icons text-sm">keyboard_arrow_up</span>
                    </button>
                    <button
                        onClick={() => onReorder('down')}
                        className="p-1 hover:bg-[#f1f5f9] dark:hover:bg-[#475569] text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white rounded-b-lg transition-colors"
                        title="아래로 이동"
                    >
                        <span className="material-icons text-sm">keyboard_arrow_down</span>
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between mb-4 pl-2">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="min-w-0 flex-1">
                        {isEditing ? (
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full font-black text-[16px] text-[#0f172a] dark:text-white bg-[#f1f5f9] dark:bg-[#475569] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#03c95c]"
                            />
                        ) : (
                            <h4
                                className={`font-black text-[16px] truncate mb-0.5 ${onProductClick ? 'text-[#0f172a] hover:text-[#03c95c] hover:underline cursor-pointer' : 'text-[#0f172a] dark:text-white'}`}
                                title={name}
                                onClick={onProductClick}
                            >
                                {name}
                            </h4>
                        )}
                        {isEditing ? (
                            <input
                                type="text"
                                value={editId}
                                onChange={(e) => setEditId(e.target.value)}
                                className="w-full text-[12px] text-[#64748b] bg-[#f1f5f9] dark:bg-[#475569] rounded-lg px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-[#03c95c]"
                            />
                        ) : (
                            <p className="text-[12px] text-[#94a3b8] font-bold truncate" title={productId}>
                                ID: {productId}
                            </p>
                        )}
                    </div>
                </div>
                {!isReadOnly && (
                    <div className="flex items-center gap-1 shrink-0">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="p-1.5 text-[#03c95c] hover:bg-[#e6f9ef] rounded-lg transition-colors"
                                    title="저장"
                                >
                                    <span className="material-icons text-lg">check</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditing(false)
                                        setEditName(name)
                                        setEditId(productId)
                                    }}
                                    className="p-1.5 text-[#94a3b8] hover:bg-[#f1f5f9] rounded-lg transition-colors"
                                    title="취소"
                                >
                                    <span className="material-icons text-lg">close</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-1.5 text-[#94a3b8] hover:text-[#03c95c] hover:bg-[#f1f5f9] dark:hover:bg-[#475569] rounded-lg transition-colors"
                                    title="수정"
                                >
                                    <span className="material-icons text-lg">edit</span>
                                </button>
                                <button
                                    onClick={() => onDelete(productDbId)}
                                    className="p-1.5 text-[#94a3b8] hover:text-red-500 hover:bg-[#f1f5f9] dark:hover:bg-[#475569] rounded-lg transition-colors"
                                    title="삭제"
                                >
                                    <span className="material-icons text-lg">delete</span>
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Keywords List - 고정 4슬롯 */}
            <div className="flex-1 space-y-2 overflow-hidden">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleKeywordDragEnd}
                >
                    <SortableContext
                        items={displayKeywords.map(kw => kw.keyword)}
                        strategy={verticalListSortingStrategy}
                    >
                        {displayKeywords.length > 0 ? displayKeywords.map((kw, i) => (
                            <SortableKeywordItem
                                key={kw.keyword}
                                kw={kw}
                                index={i}
                                isReadOnly={isReadOnly}
                                onDelete={handleDeleteKeyword}
                            />
                        )) : (
                            <div className="text-center py-4 text-[#94a3b8] text-xs font-medium">
                                키워드가 없습니다
                            </div>
                        )}
                    </SortableContext>
                </DndContext>
                {remainingCount > 0 && (
                    <div className="text-center text-[10px] text-[#94a3b8] font-medium">
                        +{remainingCount}개 더 있음
                    </div>
                )}
            </div>

            {/* Footer / Add Keyword */}
            <div className="mt-3 pt-3 border-t border-[#f1f5f9] dark:border-[#334155] shrink-0">
                {isReadOnly ? (
                    <div className="text-center text-[10px] text-[#94a3b8]">
                        {keywords.length}개 키워드
                    </div>
                ) : (
                    <form onSubmit={handleAddKeyword} className="flex gap-2">
                        <input
                            type="text"
                            value={newKeyword}
                            onChange={(e) => setNewKeyword(e.target.value)}
                            placeholder="키워드 추가"
                            className="flex-1 px-3 py-1.5 text-[11px] font-semibold bg-[#f8fafc] dark:bg-[#334155] border border-[#e2e8f0] dark:border-[#475569] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#03c95c] focus:border-transparent text-[#0f172a] dark:text-white"
                        />
                        <button
                            type="submit"
                            disabled={isAddingKeyword || !newKeyword.trim()}
                            className="px-2.5 py-1.5 bg-[#03c95c] hover:bg-[#02b350] text-white rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                            <span className="material-icons text-[14px]">add</span>
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
