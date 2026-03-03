# PWA 图标

本目录包含 FlipMemory 应用的 PWA 图标。

## 图标文件

需要生成以下尺寸的 PNG 图标：

- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-192x192.png`
- `icon-384x384.png`
- `icon-512x512.png`

## 生成方法

可以使用在线工具从 `icon.svg` 生成各种尺寸的 PNG：

1. 访问 https://realfavicongenerator.net/
2. 上传 `icon.svg`
3. 下载生成的图标包
4. 将相应尺寸的图标放入此目录

或者使用命令行工具（如 ImageMagick）：

```bash
# 安装 ImageMagick
brew install imagemagick

# 生成各种尺寸
for size in 72 96 128 144 152 192 384 512; do
  convert icon.svg -resize ${size}x${size} icon-${size}x${size}.png
done
```

## 临时解决方案

当前使用 SVG 图标作为 favicon，在 `index.html` 中：

```html
<link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
```
