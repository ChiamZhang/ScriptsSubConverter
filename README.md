# ![ScriptsSubConverter](https://raw.githubusercontent.com/ChiamZhang/ScriptsSubConverter/main/public/images/ScriptsSubConverter.png?v=1) ScriptsSubConverter / 订阅转换器

[English](#english) | [中文](#中文)

---

## English

### Overview

ScriptsSubConverter is a powerful subscription converter designed for proxy management. It provides a web-based interface to convert, customize, and optimize proxy subscription configurations with support for various script processors.

**🎯 Why ScriptsSubConverter?**

Born from the limitations of existing conversion tools, ScriptsSubConverter offers **unlimited customization** through pure JavaScript scripting. If JavaScript can do it, ScriptsSubConverter can do it - giving you complete control over your subscription processing without constraints. Say goodbye to rigid, one-size-fits-all converters and embrace true flexibility.

### Features

- **🔄 Subscription Conversion**: Convert and merge multiple subscription URLs with customizable scripts
- **📝 Script Management**: Built-in script editor with CRUD operations for custom processing logic
- **🎯 Preset Scripts**: 7 ready-to-use scripts for different scenarios:
  - `minify`: Remove comments and minimize configuration size
  - `ss-vmess-only`: Filter only Shadowsocks and VMess nodes
  - `geo-priority`: Organize nodes by geographic regions
  - `acl-mini`: Minimal ACL rules for Clash
  - `acl-lite`: Lightweight ACL rules for Clash
  - `clash-full`: Complete Clash configuration with rule providers
  - `clash-pro`: Advanced Clash configuration with AI routing and regional groups
- **🔐 Encoding Modes**: Support both URL encoding and Base64 encoding for nested subscriptions
- **🔗 Short Links**: Generate and manage short links for conversion URLs
- **🔒 Optional Password Protection**: Secure your scripts with optional authentication (disabled by default)
- **🌐 Internationalization**: Full Chinese/English bilingual support with toggle button
- **📱 Responsive Design**: Clean, user-friendly interface that works on all devices
- **🚀 Real-time Preview**: Generate conversion URLs instantly with live updates

### Installation

#### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

#### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ScriptsSubConverter.git
   cd ScriptsSubConverter
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Access the application**
   
   Open your browser and navigate to `http://localhost:3000`

#### Optional: Enable Password Protection

To protect your scripts from unauthorized access, you can enable password authentication:

1. Create a `.env` file (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set:
   ```env
   ENABLE_AUTH=true
   ACCESS_PASSWORD=your-secure-password
   ```

3. Restart the server. Now all pages require login with the password.

### UI

![alt text](https://raw.githubusercontent.com/ChiamZhang/ScriptsSubConverter/main/public/images/image.png)
![alt text](https://raw.githubusercontent.com/ChiamZhang/ScriptsSubConverter/main/public/images/image2.png)

### Usage

#### Basic Conversion

1. Open the **Convert** page
2. Enter your subscription URL(s) (one per line, or comma-separated)
3. Select a script from the dropdown (optional)
4. Choose encoding mode (URL or Base64)
5. Click **Generate Link** to create your conversion URL
6. Copy and use the generated URL in your proxy client

#### Short Link Generation

1. Fill in script and subscription URL as usual
2. Click **Generate Short Link**
3. Use the short URL for sharing and client configuration

#### Managing Scripts

1. Navigate to the **Scripts** page
2. View all available scripts with their descriptions
3. Click **Edit** to modify existing scripts
4. Click **Delete** to remove scripts (preset scripts cannot be deleted)
5. Use the script editor to create custom processing logic

#### Script Development

Scripts can process both plain text and Clash YAML configurations:

```javascript
// For text-based subscriptions
function main(content) {
  // Process the content
  return modifiedContent;
}

// For Clash YAML configurations
function main(config) {
  // Modify config.proxies, config['proxy-groups'], config.rules, etc.
  return config;
}
```

### API Endpoints

- `POST /convert` - Convert subscription with optional script processing
- `GET /api/scripts` - List all available scripts
- `POST /api/scripts` - Create a new script
- `PUT /api/scripts/:id` - Update an existing script
- `DELETE /api/scripts/:id` - Delete a script
- `POST /api/shortlink` - Create a short link
- `GET /api/shortlink/:code` - Resolve short link metadata
- `GET /s/:code` - Redirect to long URL
- `GET /health` - Health check endpoint

### Technology Stack

- **Backend**: Node.js, Express.js
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **YAML Processing**: js-yaml
- **HTTP Client**: Native http/https modules
- **Authentication**: express-session, cookie-parser (optional)
- **Environment Config**: dotenv

### Configuration

ScriptsSubConverter uses environment variables for configuration. Create a `.env` file to customize:

```env
# Server port
PORT=3005

# Enable password protection (default: false)
ENABLE_AUTH=false

# Access password (when ENABLE_AUTH=true)
ACCESS_PASSWORD=admin123

# Session secret (change in production)
SESSION_SECRET=your-secret-key
```

**Security Note**: By default, authentication is **disabled**. Enable `ENABLE_AUTH=true` to protect your scripts from unauthorized access.

### License

MIT License

---

## 中文

### 项目简介

ScriptsSubConverter 是一个强大的代理订阅转换工具，提供基于 Web 的界面来转换、定制和优化代理订阅配置，支持多种脚本处理器。

**🎯 为什么选择 ScriptsSubConverter？**

针对现有转换工具定制化能力不足的痛点，ScriptsSubConverter 通过**纯 JavaScript 脚本**实现**无限可能的自定义**。只要 JavaScript 能做到的，ScriptsSubConverter 就能做到——让您完全掌控订阅处理流程，不受任何限制。告别僵化的一刀切转换器，拥抱真正的灵活性。

### 功能特性

- **🔄 订阅转换**: 转换和合并多个订阅链接，支持自定义脚本处理
- **📝 脚本管理**: 内置脚本编辑器，支持增删改查自定义处理逻辑
- **🎯 预设脚本**: 7 个即用型脚本，适用于不同场景：
  - `minify`: 去除注释并最小化配置大小
  - `ss-vmess-only`: 仅保留 Shadowsocks 和 VMess 节点
  - `geo-priority`: 按地理区域组织节点
  - `acl-mini`: Clash 最小化 ACL 规则
  - `acl-lite`: Clash 轻量级 ACL 规则
  - `clash-full`: 完整的 Clash 配置（含规则集）
  - `clash-pro`: 高级 Clash 配置（含 AI 路由和区域分组）
- **🔐 编码模式**: 支持 URL 编码和 Base64 编码，用于嵌套订阅
- **🔗 短链接**: 为转换链接生成短链接，便于分享与配置
- **🔒 可选密码保护**: 通过可选的身份认证保护您的脚本（默认关闭）
- **🌐 国际化**: 完整的中英文双语支持，可一键切换
- **📱 响应式设计**: 简洁友好的界面，适配所有设备
- **🚀 实时预览**: 即时生成转换链接，实时更新
  - `acl-lite`: Clash 轻量级 ACL 规则
  - `clash-full`: 完整的 Clash 配置（含规则集）
  - `clash-pro`: 高级 Clash 配置（含 AI 路由和区域分组）
- **🔐 编码模式**: 支持 URL 编码和 Base64 编码，用于嵌套订阅
- **🌐 国际化**: 完整的中英文双语支持，可一键切换
- **📱 响应式设计**: 简洁友好的界面，适配所有设备
- **🚀 实时预览**: 即时生成转换链接，实时更新

## TODO
- [] Linux Windows Mac 安卓（闲置手机变废为宝）一键运行
- [] 支持 Sing-Box 配置格式转化
- [] 支持 Surge 配置格式转化
- [] 支持 Loon 配置格式转化
- [] 支持 ShadowRocket 原生配置格式转化
- [] 既然都已经有 web 服务了，不如顺便集成一个 ZashBoard（尽量做的好看些）。
- [] 既然都已经有 ZashBoard 了，不如顺便集成一个 mihomo 管理器（瞎 j8 搞，别人都做那么好看，你搞一个有什么价值吗） 
### 截图
![alt text](https://raw.githubusercontent.com/ChiamZhang/ScriptsSubConverter/main/public/images/image.png)
![alt text](https://raw.githubusercontent.com/ChiamZhang/ScriptsSubConverter/main/public/images/image2.png)
### 安装部署

#### 环境要求

- Node.js (v14 或更高版本)
- npm 或 yarn

#### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/yourusername/ScriptsSubConverter.git
   cd ScriptsSubConverter
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动服务器**
   ```bash
   npm start
   ```

4. **访问应用**
   
   在浏览器中打开 `http://localhost:3000`

#### 可选：启用密码保护

如果您想保护脚本不被未授权访问，可以启用密码认证：

1. 创建 `.env` 文件（从 `.env.example` 复制）：
   ```bash
   cp .env.example .env
   ```

2. 编辑 `.env` 文件，设置：
   ```env
   ENABLE_AUTH=true
   ACCESS_PASSWORD=你的安全密码
   ```

3. 重启服务器。现在所有页面都需要输入密码才能访问。

### 使用说明

#### 基础转换

1. 打开**转换**页面
2. 输入订阅链接（每行一个，或用逗号分隔）
3. 从下拉菜单选择脚本（可选）
4. 选择编码模式（URL 或 Base64）
5. 点击**生成链接**创建转换 URL
6. 复制生成的链接并在代理客户端中使用

#### 生成短链接

1. 按常规填写脚本与订阅链接
2. 点击**生成短链接**
3. 使用短链接进行分享或客户端配置

#### 管理脚本

1. 进入**脚本**页面
2. 查看所有可用脚本及其说明
3. 点击**编辑**修改现有脚本
4. 点击**删除**移除脚本（预设脚本不可删除）
5. 使用脚本编辑器创建自定义处理逻辑

#### 脚本开发

脚本可以处理纯文本和 Clash YAML 配置：

```javascript
// 处理文本订阅
function main(content) {
  // 处理内容
  return modifiedContent;
}

// 处理 Clash YAML 配置
function main(config) {
  // 修改 config.proxies, config['proxy-groups'], config.rules 等
  return config;
}
```

### API 接口

- `POST /convert` - 转换订阅（支持脚本处理）
- `GET /api/scripts` - 获取所有脚本列表
- `POST /api/scripts` - 创建新脚本
- `PUT /api/scripts/:id` - 更新脚本
- `DELETE /api/scripts/:id` - 删除脚本
- `POST /api/shortlink` - 创建短链接
- `GET /api/shortlink/:code` - 查询短链接信息
- `GET /s/:code` - 重定向到长链接
- `GET /health` - 健康检查接口

### 技术栈

- **后端**: Node.js, Express.js
- **前端**: 原生 JavaScript, HTML5, CSS3
- **YAML 处理**: js-yaml
- **HTTP 客户端**: 原生 http/https 模块
- **身份认证**: express-session, cookie-parser（可选）
- **环境配置**: dotenv

### 配置说明

ScriptsSubConverter 使用环境变量进行配置。创建 `.env` 文件进行自定义：

```env
# 服务器端口
PORT=3005

# 启用密码保护（默认：false）
ENABLE_AUTH=false

# 访问密码（当 ENABLE_AUTH=true 时生效）
ACCESS_PASSWORD=admin123

# Session 密钥（生产环境请修改）
SESSION_SECRET=your-secret-key
```

**安全提示**：默认情况下，身份认证处于**关闭**状态。如需保护脚本不被未授权访问，请启用 `ENABLE_AUTH=true`。

### 开源协议

MIT License

---

## Contributing / 贡献

Contributions are welcome! Please feel free to submit a Pull Request.

欢迎贡献代码！请随时提交 Pull Request。

## Support / 支持

If you encounter any issues or have questions, please open an issue on GitHub.

如有问题或疑问，请在 GitHub 上提交 issue。
