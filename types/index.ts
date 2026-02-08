export interface Product {
    id: string
    productId: string
    productName: string
    regDate: Date
}

export interface Keyword {
    id: string
    productId: string
    keyword: string
}

export interface RankHistory {
    id: string
    productId: string
    keyword: string
    rank: number | null
    createdAt: Date
}

export interface RankData {
    productName: string
    keyword: string
    currentRank: number | null
    delta: string
    updateTime: string
}

export interface StatsData {
    totalProducts: number
    totalKeywords: number
    rankUp: number
    rankDown: number
}
