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
            // 需要的 EXIF 标签
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
            // 自动解析 GPS 坐标为十进制度数
            translateValues: true,
        })

        if (exif) {
            // 拍摄时间
            exifData.takenAt = exif.DateTimeOriginal || exif.CreateDate || exif.ModifyDate || null

            // GPS 坐标
            if (exif.GPSLatitude !== undefined && exif.GPSLongitude !== undefined) {
                exifData.latitude = exif.GPSLatitude
                exifData.longitude = exif.GPSLongitude
            }

            // 相机信息
            exifData.cameraMake = exif.Make || null
            exifData.cameraModel = exif.Model || null

            // 尺寸
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
 * 使用 OpenStreetMap Nominatim API（免费）
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'FlipMemory/1.0',
                },
            }
        )

        if (!response.ok) return null

        const data = await response.json()

        // 构建位置名称
        const address = data.address
        if (!address) return null

        // 优先级: 区县 > 城市 > 省份
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
 * @param file 原始文件
 * @param maxSizeKB 最大大小（KB）
 * @param maxQuality 初始质量（0-1）
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
            // 保持原始分辨率
            canvas.width = img.width
            canvas.height = img.height

            // 绘制图片
            ctx.drawImage(img, 0, 0)

            // 二分法查找最佳质量
            let quality = maxQuality
            let minQuality = 0.1
            let blob: Blob | null = null
            const maxSizeBytes = maxSizeKB * 1024

            // 最多尝试 10 次
            for (let i = 0; i < 10; i++) {
                blob = await new Promise<Blob | null>((res) => {
                    canvas.toBlob(res, 'image/jpeg', quality)
                })

                if (!blob) {
                    reject(new Error('Failed to create blob'))
                    return
                }

                if (blob.size <= maxSizeBytes) {
                    // 已经足够小了
                    break
                }

                // 需要继续压缩
                if (quality > minQuality) {
                    quality = quality * 0.8 // 每次降低 20%
                } else {
                    // 已经是最低质量了
                    break
                }
            }

            if (!blob) {
                reject(new Error('Failed to compress image'))
                return
            }

            // 生成新文件名
            const originalName = file.name.replace(/\.[^.]+$/, '')
            const newFileName = `${originalName}.jpg`

            resolve(new File([blob], newFileName, { type: 'image/jpeg' }))
        }

        img.onerror = () => {
            reject(new Error('Failed to load image'))
        }

        // 读取文件
        const reader = new FileReader()
        reader.onload = (e) => {
            img.src = e.target?.result as string
        }
        reader.onerror = () => {
            reject(new Error('Failed to read file'))
        }
        reader.readAsDataURL(file)
    })
}

/**
 * 处理照片：提取 EXIF + 压缩
 */
export async function processPhoto(file: File): Promise<CompressedPhoto> {
    // 1. 先提取 EXIF（压缩前提取，因为压缩会丢失 EXIF）
    const exif = await extractExifData(file)

    // 2. 如果有 GPS 坐标，获取位置名称
    if (exif.latitude && exif.longitude) {
        exif.location = await reverseGeocode(exif.latitude, exif.longitude)
    }

    // 3. 压缩图片
    const compressedFile = await compressImage(file, 300)

    // 4. 如果 EXIF 中没有尺寸，从图片中获取
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
        img.onload = () => {
            resolve({ width: img.width, height: img.height })
        }
        img.onerror = reject
        img.src = URL.createObjectURL(file)
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
