#!/bin/bash

# 订阅转换服务 - 快速启动脚本 | Subscription Converter - Quick Start Script

echo "================================================"
echo "  订阅转换服务 - 重启"
echo "  Subscription Converter - Restart"
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
echo "  重启配置 | Restart Configuration"
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
echo "  重启服务... | Restarting service..."
echo "================================================"
echo ""

# 如果服务在运行则停止 | Stop service if running
PORT_TO_CHECK=${PORT:-3005}
PID=""

if command -v lsof &> /dev/null; then
    PID=$(lsof -ti:${PORT_TO_CHECK})
elif command -v fuser &> /dev/null; then
    PID=$(fuser -n tcp ${PORT_TO_CHECK} 2>/dev/null)
fi

# 如果端口被占用但没有权限获取 PID，给出提示
if [ -z "$PID" ] && command -v ss &> /dev/null; then
    if ss -ltn "sport = :${PORT_TO_CHECK}" | grep -q ":${PORT_TO_CHECK}"; then
        echo "⚠️ 端口 ${PORT_TO_CHECK} 已被占用，但无法获取 PID。"
        echo "请手动停止占用端口的进程，或使用 PORT=新端口 重新启动。"
        exit 1
    fi
fi

if [ -n "$PID" ]; then
    echo "发现运行中的服务 (PID: $PID)，正在停止... | Found running service, stopping..."
    kill $PID
    sleep 1
fi

# 启动服务 | Start service
node server.js
