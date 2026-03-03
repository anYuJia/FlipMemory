#!/usr/bin/env node
/**
 * 图标生成脚本
 * 从源图像生成各种尺寸的 PWA 和 Android 图标
 */

import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 图标尺寸配置
const PWA_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const ANDROID_SIZES = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192,
};

// 源图像路径 - 使用传入参数或默认路径
const sourceImage = process.argv[2] || join(__dirname, '../public/icons/icon-source.png');
const outputDir = join(__dirname, '../public/icons');

async function generateIcons() {
    console.log('🎨 开始生成图标...\n');

    // 确保输出目录存在
    if (!existsSync(outputDir)) {
        await mkdir(outputDir, { recursive: true });
    }

    // 检查源文件
    if (!existsSync(sourceImage)) {
        console.error(`❌ 源图像不存在: ${sourceImage}`);
        console.log('请先将源图像放置到正确位置，或作为参数传入路径');
        process.exit(1);
    }

    console.log(`📁 源图像: ${sourceImage}`);
    console.log(`📁 输出目录: ${outputDir}\n`);

    // 生成 PWA 图标
    console.log('📱 生成 PWA 图标...');
    for (const size of PWA_SIZES) {
        const outputPath = join(outputDir, `icon-${size}x${size}.png`);
        await sharp(sourceImage)
            .resize(size, size, {
                fit: 'contain',
                background: { r: 254, g: 243, b: 226, alpha: 1 } // #fef3e2
            })
            .png()
            .toFile(outputPath);
        console.log(`  ✅ icon-${size}x${size}.png`);
    }

    // 生成 favicon
    console.log('\n🔖 生成 favicon...');
    const faviconPath = join(outputDir, '../favicon.ico');
    await sharp(sourceImage)
        .resize(32, 32)
        .png()
        .toFile(join(outputDir, 'favicon-32x32.png'));
    console.log('  ✅ favicon-32x32.png');

    await sharp(sourceImage)
        .resize(16, 16)
        .png()
        .toFile(join(outputDir, 'favicon-16x16.png'));
    console.log('  ✅ favicon-16x16.png');

    // 生成 Apple Touch Icon
    console.log('\n🍎 生成 Apple Touch Icon...');
    await sharp(sourceImage)
        .resize(180, 180)
        .png()
        .toFile(join(outputDir, 'apple-touch-icon.png'));
    console.log('  ✅ apple-touch-icon.png');

    // 生成 Android 自适应图标 (前景层)
    console.log('\n🤖 生成 Android 图标...');
    for (const [density, size] of Object.entries(ANDROID_SIZES)) {
        const outputPath = join(outputDir, `android-${density}.png`);
        await sharp(sourceImage)
            .resize(size, size)
            .png()
            .toFile(outputPath);
        console.log(`  ✅ android-${density}.png (${size}x${size})`);
    }

    // 生成 maskable 图标 (带更多内边距)
    console.log('\n🎭 生成 Maskable 图标...');
    const maskableSizes = [192, 512];
    for (const size of maskableSizes) {
        const padding = Math.floor(size * 0.1); // 10% padding
        const innerSize = size - (padding * 2);
        const outputPath = join(outputDir, `maskable-icon-${size}x${size}.png`);

        await sharp(sourceImage)
            .resize(innerSize, innerSize, {
                fit: 'contain',
                background: { r: 254, g: 243, b: 226, alpha: 1 }
            })
            .extend({
                top: padding,
                bottom: padding,
                left: padding,
                right: padding,
                background: { r: 254, g: 243, b: 226, alpha: 1 }
            })
            .png()
            .toFile(outputPath);
        console.log(`  ✅ maskable-icon-${size}x${size}.png`);
    }

    console.log('\n✨ 所有图标生成完成！');
}

generateIcons().catch(console.error);
