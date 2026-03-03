#!/bin/bash

# 测试覆盖率报告脚本

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           FlipMemory 测试覆盖率报告                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# 运行测试并生成覆盖率报告
echo "📊 生成覆盖率报告..."
npm run test:coverage

echo ""
echo "✅ 覆盖率报告已生成"
echo ""
echo "📁 报告位置："
echo "   - HTML 报告: coverage/index.html"
echo "   - LCOV 报告: coverage/lcov.info"
echo ""

# 显示覆盖率摘要
if [ -f "coverage/coverage-summary.json" ]; then
    echo "📈 覆盖率摘要："
    cat coverage/coverage-summary.json | jq '.total'
fi

echo ""
echo "💡 提示："
echo "   - 在浏览器中打开 coverage/index.html 查看详细报告"
echo "   - 使用 'npm run test -- --watch' 进行开发时测试"
echo "   - 使用 'npm run test:ui' 打开测试 UI"
