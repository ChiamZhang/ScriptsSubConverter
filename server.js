// 加载环境变量
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3005;

// 认证配置（从环境变量读取）
const ENABLE_AUTH = process.env.ENABLE_AUTH === 'true'; // 默认关闭认证
const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || 'admin123';

console.log(`🔐 认证状态: ${ENABLE_AUTH ? '已启用' : '已禁用'}`);
if (ENABLE_AUTH) {
  console.log(`🔑 访问密码已设置 (通过环境变量 ACCESS_PASSWORD 修改)`);
}

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'subconverter-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000, // 24小时
    httpOnly: true
  }
}));

// 认证中间件
function requireAuth(req, res, next) {
  // 如果未启用认证，直接放行
  if (!ENABLE_AUTH) {
    return next();
  }
  
  if (req.session && req.session.authenticated) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

// 登录页面路由
app.get('/login', (req, res) => {
  // 如果未启用认证，重定向到首页
  if (!ENABLE_AUTH) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 登录验证
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ACCESS_PASSWORD) {
    req.session.authenticated = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// 登出
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// 检查认证状态
app.get('/api/auth/check', (req, res) => {
  res.json({ 
    authenticated: ENABLE_AUTH ? !!req.session.authenticated : true,
    authEnabled: ENABLE_AUTH
  });
});

// 静态文件需要认证（除了登录页面）
app.use((req, res, next) => {
  // 如果未启用认证，直接放行
  if (!ENABLE_AUTH) {
    return next();
  }
  
  // 允许访问登录相关资源和转换 API
  if (req.path === '/login' || req.path === '/login.html' || 
      req.path.startsWith('/api/login') || req.path.startsWith('/api/auth/check') ||
      req.path === '/convert' || req.path.startsWith('/api/shortlink') ||
      req.path.startsWith('/s/')) {
    return next();
  }
  
  // 检查是否已认证
  if (!req.session || !req.session.authenticated) {
    return res.redirect('/login');
  }
  
  next();
});

app.use(express.static('public'));

// 数据目录
const dataDir = path.join(__dirname, 'data');
const configsDir = path.join(dataDir, 'configs');
const scriptsDir = path.join(dataDir, 'scripts');
const shortlinksFile = path.join(dataDir, 'shortlinks.json');

// 确保目录存在
[dataDir, configsDir, scriptsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 短链接存储
let shortlinks = {};
if (fs.existsSync(shortlinksFile)) {
  try {
    shortlinks = JSON.parse(fs.readFileSync(shortlinksFile, 'utf8')) || {};
  } catch (e) {
    console.warn('短链接文件解析失败，将重置:', e.message);
    shortlinks = {};
  }
}

function saveShortlinks() {
  try {
    fs.writeFileSync(shortlinksFile, JSON.stringify(shortlinks, null, 2));
  } catch (e) {
    console.error('保存短链接失败:', e.message);
  }
}

function generateShortCode(length = 6) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getBaseUrl(req) {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL.replace(/\/$/, '');
  }
  return `${req.protocol}://${req.get('host')}`;
}

// ==================== 脚本管理 ====================

// 获取所有脚本
app.get('/api/scripts', (req, res) => {
  try {
    if (!fs.existsSync(scriptsDir)) {
      return res.json([]);
    }
    const files = fs.readdirSync(scriptsDir);
    const scripts = files.filter(f => f.endsWith('.js')).map(f => {
      const name = f.replace('.js', '');
      const code = fs.readFileSync(path.join(scriptsDir, f), 'utf8');
      return { name, code };
    });
    
    // 检查是否是来自网页的请求
    const referer = req.headers.referer || '';
    // 如果 referer 中包含 .html 或者是主页路径，说明是网页访问
    const isWebPageRequest = referer.includes('.html') || referer.endsWith('/');
    
    if (isWebPageRequest) {
      // 仃正网页访问：过滤掉包含 'hidden' 的脚本
      const filtered = scripts.filter(s => !s.name.toLowerCase().includes('hidden'));
      return res.json(filtered);
    }
    
    // 纯 API 调用（没有 referer 或是 programmatic 调用）：返回所有脚本
    res.json(scripts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个脚本
app.get('/api/scripts/:name', (req, res) => {
  try {
    const scriptName = req.params.name;
    const filePath = path.join(scriptsDir, `${scriptName}.js`);
    
    // 检查是否是网页访问
    const referer = req.headers.referer || '';
    const isWebPageRequest = referer.includes('.html') || referer.endsWith('/');
    
    if (isWebPageRequest && scriptName.toLowerCase().includes('hidden')) {
      // 网页访问 hidden 脚本：拒绝
      return res.status(403).json({ error: '禁止访问此脚本' });
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '脚本不存在' });
    }
    const code = fs.readFileSync(filePath, 'utf8');
    res.json({ name: scriptName, code });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建或更新脚本
app.post('/api/scripts/:name', (req, res) => {
  try {
    const { code } = req.body;
    const filePath = path.join(scriptsDir, `${req.params.name}.js`);
    
    // 验证脚本是否有效
    try {
      new Function(code);
    } catch (e) {
      return res.status(400).json({ error: '脚本语法错误: ' + e.message });
    }
    
    fs.writeFileSync(filePath, code);
    res.json({ success: true, name: req.params.name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除脚本
app.delete('/api/scripts/:name', (req, res) => {
  try {
    const filePath = path.join(scriptsDir, `${req.params.name}.js`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '脚本不存在' });
    }
    fs.unlinkSync(filePath);
    res.json({ success: true, message: '脚本已删除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== 编码工具 ====================

// Base64 编码/解码
const encodeBase64 = (str) => Buffer.from(str).toString('base64');
const decodeBase64 = (str) => Buffer.from(str, 'base64').toString('utf-8');

// ==================== 订阅转换核心功能 ====================

// ==================== 短链接功能 ====================

// 创建短链接
app.post('/api/shortlink', (req, res) => {
  try {
    const { url, script, sub, filename, data } = req.body || {};
    let target = url;

    if (!target) {
      const params = new URLSearchParams();
      if (data) {
        params.set('data', data);
      } else {
        if (script) params.set('script', script);
        if (sub) params.set('sub', sub);
        if (filename) params.set('filename', filename);
      }

      if (!params.toString()) {
        return res.status(400).json({ error: '缺少必要参数: url 或 script/sub' });
      }

      target = `${getBaseUrl(req)}/convert?${params.toString()}`;
    }

    if (!/^https?:\/\//i.test(target)) {
      const prefix = target.startsWith('/') ? '' : '/';
      target = `${getBaseUrl(req)}${prefix}${target}`;
    }

    const existing = Object.entries(shortlinks).find(([, value]) => value.url === target);
    if (existing) {
      const [code] = existing;
      return res.json({
        code,
        url: target,
        shortUrl: `${getBaseUrl(req)}/s/${code}`
      });
    }

    let code = '';
    let attempts = 0;
    while (attempts < 10) {
      code = generateShortCode(6 + Math.floor(attempts / 3));
      if (!shortlinks[code]) break;
      attempts += 1;
    }

    if (!code || shortlinks[code]) {
      return res.status(500).json({ error: '生成短链接失败，请重试' });
    }

    shortlinks[code] = { url: target, createdAt: new Date().toISOString() };
    saveShortlinks();

    res.json({
      code,
      url: target,
      shortUrl: `${getBaseUrl(req)}/s/${code}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 解析短链接
app.get('/api/shortlink/:code', (req, res) => {
  const { code } = req.params;
  const entry = shortlinks[code];
  if (!entry) {
    return res.status(404).json({ error: '短链接不存在' });
  }
  res.json({ code, url: entry.url, createdAt: entry.createdAt });
});

// 访问短链接（重定向）
app.get('/s/:code', (req, res) => {
  const { code } = req.params;
  const entry = shortlinks[code];
  if (!entry) {
    return res.status(404).send('Short link not found');
  }
  res.redirect(302, entry.url);
});

// 获取原始订阅内容
async function fetchSubscription(url) {
  return new Promise((resolve, reject) => {
    console.log('开始获取订阅:', url);
    
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'clash-verge/v1.3.8'
      },
      timeout: 15000
    };
    
    const req = protocol.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('获取订阅成功，内容长度:', data.length);
          resolve(data);
        } else {
          console.error('HTTP 错误:', res.statusCode, res.statusMessage);
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('请求失败:', error.message);
      reject(new Error(`获取订阅失败: ${error.message}`));
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('获取订阅超时'));
    });
    
    req.end();
  });
}

// 执行脚本处理订阅 - 支持两种格式
function executeScript(content, scriptCode) {
  try {
    // 检测脚本类型
    const isClashFormat = scriptCode.includes('function main') || 
                          scriptCode.includes('config.proxies') ||
                          scriptCode.includes('proxy-groups');
    
    if (isClashFormat) {
      // Clash 配置格式：处理 YAML -> JSON -> 脚本 -> JSON -> YAML
      let config;
      
      // 尝试解析为 JSON（如果订阅已经是 JSON 格式）
      try {
        config = JSON.parse(content);
      } catch (e) {
        // 如果不是 JSON，尝试解析为 YAML
        const yaml = require('js-yaml');
        try {
          config = yaml.load(content);
        } catch (yamlError) {
          console.error('YAML 解析失败:', yamlError);
          return content;
        }
      }
      
      // 执行脚本中的 main 函数
      const scriptFunc = new Function('config', scriptCode + '\nreturn main(config);');
      const processedConfig = scriptFunc(config);
      
      // 如果脚本输出了文本配置，直接返回
      if (processedConfig && typeof processedConfig.text === 'string') {
        return processedConfig.text;
      }

      // 返回 YAML 格式
      const yaml = require('js-yaml');
      return yaml.dump(processedConfig, { 
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
      });
    } else {
      // 简单文本格式：return content...
      const fn = new Function('content', scriptCode);
      const result = fn(content);
      return result || content;
    }
  } catch (error) {
    console.error('脚本执行错误:', error);
    return content; // 失败时返回原始内容
  }
}

// 主转换接口
app.get('/convert', async (req, res) => {
  try {
    let script = req.query.script;
    let sub = req.query.sub;
    let filename = req.query.filename;
    
    // 处理 base64 编码的数据
    if (req.query.data && !sub) {
      try {
        const decoded = decodeBase64(decodeURIComponent(req.query.data));
        const params = new URLSearchParams(decoded);
        script = params.get('script');
        sub = params.get('sub');
        filename = params.get('filename');
      } catch (e) {
        return res.status(400).json({ error: '无效的编码数据' });
      }
    }
    
    if (!script || !sub) {
      return res.status(400).json({ error: '缺少必要参数: script 和 sub' });
    }
    
    // 设置默认文件名
    if (!filename) {
      filename = 'subscription.yaml';
    }
    
    // 确保 sub 是正确解码的 URL
    // Express 已经自动解码了 query 参数，但如果是从 Base64 来的，需要再解码一次
    console.log('原始 sub:', sub);
    
    // 读取脚本
    let scriptCode = '';
    const scriptPath = path.join(scriptsDir, `${script}.js`);
    if (fs.existsSync(scriptPath)) {
      scriptCode = fs.readFileSync(scriptPath, 'utf8');
    } else {
      return res.status(404).json({ error: `脚本 "${script}" 不存在` });
    }
    
    // 获取订阅内容
    const content = await fetchSubscription(sub);
    
    // 执行脚本处理
    const processed = executeScript(content, scriptCode);
    
    // 返回处理后的内容
    const looksLikeIni = typeof processed === 'string' && /^\s*\[General\]/m.test(processed);
    if (looksLikeIni && (!filename || filename === 'subscription.yaml')) {
      filename = 'subscription.conf';
    }

    const contentType = looksLikeIni ? 'text/plain; charset=utf-8' : 'text/yaml; charset=utf-8';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(processed);
    
  } catch (error) {
    console.error('转换错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 健康检查 ====================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`订阅转换服务已启动: http://localhost:${PORT}`);
  console.log(`配置目录: ${configsDir}`);
  console.log(`脚本目录: ${scriptsDir}`);
});
