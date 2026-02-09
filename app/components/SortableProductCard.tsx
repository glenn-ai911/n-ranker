'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ProductCard } from './ProductCard'

interface SortableProductCardProps {
    id: string
    name: string
    productId: string
    productDbId: string
    isReadOnly: boolean
    onDelete: (id: string) => void
    onUpdate: () => void
    onProductClick?: () => void
    keywords: { keyword: string; rank: number | null; delta: number | null }[]
    order?: number
}

export function SortableProductCard(props: SortableProductCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: props.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : 'auto',
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <ProductCard
                name={props.name}
                productId={props.productId}
                productDbId={props.productDbId}
                isReadOnly={props.isReadOnly}
                onDelete={props.onDelete}
                onUpdate={props.onUpdate}
                onProductClick={props.onProductClick}
                keywords={props.keywords}
                order={props.order}
                dragHandleProps={listeners} // 드래그 핸들 props 전달
            />
        </div>
    )
}
