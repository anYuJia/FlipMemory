/**
 * 图片处理工具
 * - EXIF 信息提取
 * - 图片压缩（保持分辨率，压缩画质到 300KB 以内）
 * - 转换为 JPG 格式
 */

import exifr from 'exifr'

// EXIF 数据接口
export interface PhotoExifData {
    // 拍摄时间
    takenAt: Date | null
    // GPS 坐标
    latitude: number | null
    longitude: number | null
    // 位置名称（需要反向地理编码获取）
    location: string | null
    // 相机信息
    cameraMake: string | null
    cameraModel: string | null
    // 原始宽高
    width: number | null
    height: number | null
}

// 压缩结果接口
export interface CompressedPhoto {
    // 压缩后的文件
    file: File
    // EXIF 数据
    exif: PhotoExifData
    // 原始文件名
    originalName: string
    // 压缩前大小
    originalSize: number
    // 压缩后大小
    compressedSize: number
}

/**
 * 清理文件名中的非法字符
 */
export function sanitizeFilename(name: string): string {
    // 只保留字母、数字、点、下划线、减号
    return name
        .replace(/[^\w\.\-]/gi, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '') // 移除首尾下划线
}

/**
 * 从图片文件中提取 EXIF 数据
 */
export async function extractExifData(file: File): Promise<PhotoExifData> {
    const exifData: PhotoExifData = {
        takenAt: null,
        latitude: null,
        longitude: null,
        location: null,
        cameraMake: null,
        cameraModel: null,
        width: null,
        height: null,
    }

    try {
        // 读取 EXIF 数据
        const exif = await exifr.parse(file, {
            pick: [
                'DateTimeOriginal',
                'CreateDate',
                'ModifyDate',
                'GPSLatitude',
                'GPSLongitude',
                'Make',
                'Model',
                'ImageWidth',
                'ImageHeight',
                'ExifImageWidth',
                'ExifImageHeight',
            ],
            translateValues: true,
        })

        if (exif) {
            exifData.takenAt = exif.DateTimeOriginal || exif.CreateDate || exif.ModifyDate || null
            if (exif.GPSLatitude !== undefined && exif.GPSLongitude !== undefined) {
                exifData.latitude = exif.GPSLatitude
                exifData.longitude = exif.GPSLongitude
            }
            exifData.cameraMake = exif.Make || null
            exifData.cameraModel = exif.Model || null
            exifData.width = exif.ExifImageWidth || exif.ImageWidth || null
            exifData.height = exif.ExifImageHeight || exif.ImageHeight || null
        }
    } catch (error) {
        console.warn('Failed to extract EXIF data:', error)
    }

    return exifData
}

/**
 * 使用反向地理编码获取位置名称
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`,
            { headers: { 'User-Agent': 'FlipMemory/1.0' } }
        )
        if (!response.ok) return null
        const data = await response.json()
        const address = data.address
        if (!address) return null
        const parts: string[] = []
        if (address.city || address.town || address.county) {
            parts.push(address.city || address.town || address.county)
        }
        if (address.district || address.suburb) {
            parts.push(address.district || address.suburb)
        }
        return parts.length > 0 ? parts.join(' · ') : null
    } catch (error) {
        console.warn('Failed to reverse geocode:', error)
        return null
    }
}

/**
 * 压缩图片到指定大小以内
 */
export async function compressImage(
    file: File,
    maxSizeKB: number = 150,
    maxQuality: number = 0.85
): Promise<File> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
        }

        img.onload = async () => {
            canvas.width = img.width
            canvas.height = img.height
            ctx.drawImage(img, 0, 0)

            let quality = maxQuality
            let minQuality = 0.1
            let blob: Blob | null = null
            const maxSizeBytes = maxSizeKB * 1024

            for (let i = 0; i < 10; i++) {
                blob = await new Promise<Blob | null>((res) => {
                    canvas.toBlob(res, 'image/jpeg', quality)
                })
                if (!blob) {
                    reject(new Error('Failed to create blob'))
                    return
                }
                if (blob.size <= maxSizeBytes) break
                if (quality > minQuality) {
                    quality = quality * 0.8
                } else {
                    break
                }
            }

            if (!blob) {
                reject(new Error('Failed to compress image'))
                return
            }

            const originalName = file.name.replace(/\.[^.]+$/, '')
            const safeName = sanitizeFilename(originalName) || 'photo'
            const newFileName = `${safeName}.jpg`

            resolve(new File([blob], newFileName, { type: 'image/jpeg' }))
        }

        img.onerror = () => reject(new Error('Failed to load image'))

        const reader = new FileReader()
        reader.onload = (e) => {
            const result = e.target?.result
            if (typeof result === 'string') img.src = result
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
    })
}

/**
 * 处理照片：提取 EXIF + 压缩
 */
export async function processPhoto(file: File): Promise<CompressedPhoto> {
    const exif = await extractExifData(file)
    if (exif.latitude && exif.longitude) {
        exif.location = await reverseGeocode(exif.latitude, exif.longitude)
    }
    const compressedFile = await compressImage(file, 300)
    if (!exif.width || !exif.height) {
        const dimensions = await getImageDimensions(file)
        exif.width = dimensions.width
        exif.height = dimensions.height
    }
    return {
        file: compressedFile,
        exif,
        originalName: file.name,
        originalSize: file.size,
        compressedSize: compressedFile.size,
    }
}

/**
 * 获取图片尺寸
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const objectUrl = URL.createObjectURL(file)
        img.onload = () => {
            URL.revokeObjectURL(objectUrl)
            resolve({ width: img.width, height: img.height })
        }
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl)
            reject(new Error('Failed to load image for dimensions'))
        }
        img.src = objectUrl
    })
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDateToString(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/**
 * 导出统一的对象接口
 */
export const imageProcessor = {
    extractExif: extractExifData,
    compress: compressImage,
    process: processPhoto,
}
