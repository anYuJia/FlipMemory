/**
 * 测试统计脚本
 * 统计测试文件数量、测试用例数量等信息
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.join(__dirname, '../src')

interface TestStats {
    totalTestFiles: number
    totalTestCases: number
    testsByCategory: Record<string, { files: number; cases: number }>
}

function countTestCases(content: string): number {
    const matches = content.match(/it\(['"`]/g) || []
    return matches.length
}

function walkDir(dir: string, stats: TestStats, category: string = 'other'): void {
    const files = fs.readdirSync(dir)

    for (const file of files) {
        const filePath = path.join(dir, file)
        const stat = fs.statSync(filePath)

        if (stat.isDirectory()) {
            if (file === '__tests__') {
                walkDir(filePath, stats, category)
            } else {
                walkDir(filePath, stats, file)
            }
        } else if (file.endsWith('.test.ts') || file.endsWith('.spec.ts')) {
            const content = fs.readFileSync(filePath, 'utf-8')
            const testCases = countTestCases(content)

            stats.totalTestFiles++
            stats.totalTestCases += testCases

            if (!stats.testsByCategory[category]) {
                stats.testsByCategory[category] = { files: 0, cases: 0 }
            }
            stats.testsByCategory[category].files++
            stats.testsByCategory[category].cases += testCases
        }
    }
}

function main() {
    const stats: TestStats = {
        totalTestFiles: 0,
        totalTestCases: 0,
        testsByCategory: {},
    }

    walkDir(srcDir, stats)

    console.log('\n╔════════════════════════════════════════════════════════════════╗')
    console.log('║              FlipMemory 测试统计                              ║')
    console.log('╚════════════════════════════════════════════════════════════════╝\n')

    console.log(`📊 总体统计:`)
    console.log(`   测试文件数: ${stats.totalTestFiles}`)
    console.log(`   测试用例数: ${stats.totalTestCases}`)
    console.log(`   平均每文件: ${(stats.totalTestCases / stats.totalTestFiles).toFixed(1)} 个用例\n`)

    console.log(`📁 按类别统计:`)
    for (const [category, data] of Object.entries(stats.testsByCategory)) {
        console.log(`   ${category}:`)
        console.log(`      文件数: ${data.files}`)
        console.log(`      用例数: ${data.cases}`)
    }

    console.log(`\n✅ 测试覆盖率目标: 50%+`)
    console.log(`📈 当前进度: ${Math.round((stats.totalTestFiles / 20) * 100)}% (${stats.totalTestFiles}/20 文件)\n`)
}

main()
