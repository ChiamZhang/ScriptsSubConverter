#!/bin/bash

# 订阅转换服务 - 快速启动脚本 | Subscription Converter - Quick Start Script

echo "================================================"
echo "  订阅转换服务 - 快速启动"
echo "  Subscription Converter - Quick Start"
echo "================================================"
echo ""

# 检查 Node.js | Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未检测到 Node.js | Error: Node.js not found"
    echo "请先安装 Node.js | Please install Node.js: https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js 版本 | Version: $(node --version)"
echo ""

# 检查依赖 | Check dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖... | Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败 | Dependencies installation failed"
        exit 1
    fi
    echo "✓ 依赖安装完成 | Dependencies installed"
else
    echo "✓ 依赖已安装 | Dependencies installed"
fi

echo ""
echo "================================================"
echo "  启动配置 | Launch Configuration"
echo "================================================"
echo ""
echo "服务地址 | Service URL: http://localhost:3005"
echo "Web 界面 | Web Interface: http://localhost:3005"
echo "API 基地址 | API Base URL: http://localhost:3005/api"
echo ""
echo "配置目录 | Config Directory: $(pwd)/data/configs"
echo "脚本目录 | Scripts Directory: $(pwd)/data/scripts"
echo ""

echo "按 Ctrl+C 停止服务 | Press Ctrl+C to stop"
echo ""
echo "================================================"
echo "  启动服务... | Starting service..."
echo "================================================"
echo ""

# 启动服务 | Start service
node server.js
