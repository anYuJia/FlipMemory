// 记忆相关类型定义

export interface Memory {
    id: string
    date: string           // YYYY-MM-DD 格式
    content: string | null
    mood: MoodType | null
    isPrivate: boolean
    weather: string | null
    location: string | null
    photos: Photo[]
    tags: Tag[]
    createdAt: string
    updatedAt: string
}

export interface Photo {
    id: string
    key?: string | null
    originalUrl: string
    thumbnailUrl: string
    mediumUrl: string
    takenAt: string | null
    width: number | null
    height: number | null
    order: number
}

export interface Tag {
    id: string
    name: string
    color: string | null
}

// 情绪类型
export type MoodType =
    | 'happy'     // 😊 开心
    | 'sad'       // 😢 难过
    | 'angry'     // 😡 生气
    | 'calm'      // 😌 平静
    | 'excited'   // 🤩 兴奋
    | 'tired'     // 😴 疲惫
    | 'loved'     // 🥰 幸福
    | 'thinking'  // 🤔 思考

// 情绪到 Emoji 的映射
export const MoodEmoji: Record<MoodType, string> = {
    happy: '😊',
    sad: '😢',
    angry: '😡',
    calm: '😌',
    excited: '🤩',
    tired: '😴',
    loved: '🥰',
    thinking: '🤔',
}

// 情绪到中文的映射
export const MoodLabel: Record<MoodType, string> = {
    happy: '开心',
    sad: '难过',
    angry: '生气',
    calm: '平静',
    excited: '兴奋',
    tired: '疲惫',
    loved: '幸福',
    thinking: '思考',
}

// 情绪到颜色的映射
export const MoodColor: Record<MoodType, string> = {
    happy: '#FFD93D',
    sad: '#6C9BCF',
    angry: '#FF6B6B',
    calm: '#95E1D3',
    excited: '#FF8C00',
    tired: '#B4B4B4',
    loved: '#FF69B4',
    thinking: '#DDA0DD',
}

// 日历日期数据
export interface CalendarDay {
    date: string
    hasMemory: boolean
    mood: MoodType | null
    thumbnailUrl: string | null
}

// 照片上传数据
export interface PhotoUploadData {
    key: string
    takenAt?: string | null
    latitude?: number | null
    longitude?: number | null
    width?: number | null
    height?: number | null
}

// 创建记忆的表单数据
export interface CreateMemoryInput {
    date: string
    content?: string
    mood?: MoodType
    photoKeys?: string[]  // 向后兼容
    photos?: PhotoUploadData[]  // 推荐使用，包含 EXIF 数据
    // 本地离线照片（仅本地缓存和离线同步使用，不直接透传后端）
    localPhotos?: Array<{
        id: string
        key?: string | null
        originalUrl: string
        thumbnailUrl: string
        mediumUrl: string
        takenAt?: string | null
        width?: number | null
        height?: number | null
        order?: number
    }>
    tags?: string[]
    location?: string
    weather?: string
}

// 更新记忆的表单数据
export interface UpdateMemoryInput {
    content?: string
    mood?: MoodType
    isPrivate?: boolean
    tags?: string[]
    location?: string
    weather?: string
}
