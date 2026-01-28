// 加载环境变量
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const yaml = require('js-yaml');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3005;
const ENABLE_LOG = process.env.ENABLE_LOG !== 'false';
const SHORTLINK_EXPIRE_DAYS = parseInt(process.env.SHORTLINK_EXPIRE_DAYS || '7', 10);
const PROJECT_ROOT = __dirname;
const DEFAULT_LOG_FILE = path.join(PROJECT_ROOT, 'logs', 'server.log');
const LOG_FILE = process.env.LOG_FILE || DEFAULT_LOG_FILE;
const LOG_MIRROR_FILE = process.env.LOG_MIRROR_FILE;

function resolveFromProjectRoot(p) {
  if (!p) return p;
  return path.isAbsolute(p) ? p : path.join(PROJECT_ROOT, p);
}

let CURRENT_LOG_FILES = [];
function canWritePath(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.accessSync(filePath, fs.constants.W_OK);
      return true;
    }
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      // 若目录不存在，尝试检查其父目录可写（mkdir 的前提）
      const parent = path.dirname(dir);
      fs.accessSync(parent, fs.constants.W_OK);
      return true;
    }
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch (_) {
    return false;
  }
}
{
  const primary = resolveFromProjectRoot(LOG_FILE);
  if (primary && canWritePath(primary)) CURRENT_LOG_FILES.push(primary);

  // 可选额外镜像路径
  if (LOG_MIRROR_FILE) {
    const mirror = resolveFromProjectRoot(LOG_MIRROR_FILE);
    if (
      mirror &&
      canWritePath(mirror) &&
      !CURRENT_LOG_FILES.some(f => path.resolve(f) === path.resolve(mirror))
    ) {
      CURRENT_LOG_FILES.push(mirror);
    }
  }

  // 若用户启用了文件日志但所有路径都不可写，直接降级到 /tmp
  if (ENABLE_LOG && CURRENT_LOG_FILES.length === 0) {
    const fallback = path.join(os.tmpdir(), 'subconverter.log');
    CURRENT_LOG_FILES = [fallback];
  }
}

// 日志封装：控制台与文件一致输出；文件额外写更详细的 JSONL
const originalConsole = { log: console.log, warn: console.warn, error: console.error };
let fileLogAvailable = true;
let triedFallbackLog = false;
const LOG_FILE_MODE = (process.env.LOG_FILE_MODE || 'jsonl').toLowerCase(); // jsonl | text
const LOG_FALLBACK = process.env.LOG_FALLBACK !== 'false'; // default true
let warnedNoFileLogging = false;

function safeJsonStringify(value) {
  const seen = new WeakSet();
  return JSON.stringify(value, (key, val) => {
    if (typeof val === 'bigint') return val.toString();
    if (val instanceof Error) {
      return { name: val.name, message: val.message, stack: val.stack };
    }
    if (val && typeof val === 'object') {
      if (seen.has(val)) return '[Circular]';
      seen.add(val);
    }
    return val;
  });
}

function serializeArgForConsole(a) {
  if (a instanceof Error) {
    return `${a.message} stack=${a.stack}`;
  }
  if (typeof a === 'string') return a;
  try {
    return safeJsonStringify(a);
  } catch (_) {
    return String(a);
  }
}

function serializeArgForFile(a) {
  if (a instanceof Error) {
    return { error: { name: a.name, message: a.message, stack: a.stack } };
  }
  if (typeof a === 'string') return a;
  return a;
}

function ensureWritableDir(filePath) {
  const targetDir = path.dirname(filePath);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
}

function writeToFiles(lineText, entryObject) {
  if (!ENABLE_LOG || !fileLogAvailable) return;
  if (CURRENT_LOG_FILES.length === 0) {
    if (!warnedNoFileLogging) {
      warnedNoFileLogging = true;
      originalConsole.warn('未配置可写日志文件，已跳过写文件日志');
    }
    return;
  }

  for (const filePath of [...CURRENT_LOG_FILES]) {
    try {
      ensureWritableDir(filePath);
      if (LOG_FILE_MODE === 'text') {
        fs.appendFileSync(filePath, lineText + '\n');
      } else {
        fs.appendFileSync(filePath, safeJsonStringify(entryObject) + '\n');
      }
    } catch (e) {
      // 单个路径写失败：移除该路径，继续尝试其它路径
      CURRENT_LOG_FILES = CURRENT_LOG_FILES.filter(f => path.resolve(f) !== path.resolve(filePath));
      originalConsole.warn('日志写入失败，已跳过该日志文件', filePath, e.message);

      // 如果一个都不剩，尝试 fallback
      if (CURRENT_LOG_FILES.length === 0 && LOG_FALLBACK && !triedFallbackLog) {
        triedFallbackLog = true;
        try {
          const fallback = path.join(os.tmpdir(), 'subconverter.log');
          ensureWritableDir(fallback);
          fs.appendFileSync(
            fallback,
            (LOG_FILE_MODE === 'text' ? (lineText + '\n') : (safeJsonStringify(entryObject) + '\n'))
          );
          CURRENT_LOG_FILES = [fallback];
          originalConsole.warn('已切换到临时日志文件', fallback);
          return;
        } catch (fallbackErr) {
          originalConsole.error('临时日志写入失败', fallbackErr.message);
        }
      }

      if (CURRENT_LOG_FILES.length === 0) {
        // 不再创建额外日志文件时，保持服务运行但停止文件日志
        fileLogAvailable = false;
        if (!warnedNoFileLogging) {
          warnedNoFileLogging = true;
          originalConsole.error('写入日志失败，已停止写文件', e.message, { LOG_FALLBACK });
        }
        return;
      }
    }
  }
}

function writeLog(level, args) {
  const now = new Date();
  // 使用本地时间（CST/UTC+8），而非 UTC
  const ts = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + 'T' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0') + '.' +
    String(now.getMilliseconds()).padStart(3, '0') + '+08:00';
  const consoleParts = args.map(serializeArgForConsole);
  const lineText = [ts, level, ...consoleParts].join(' ');

  const fileArgs = args.map(serializeArgForFile);
  const entry = {
    ts,
    level,
    pid: process.pid,
    hostname: os.hostname(),
    cwd: process.cwd(),
    line: lineText,
    args: fileArgs
  };

  writeToFiles(lineText, entry);

  const printer = level === 'ERROR' ? originalConsole.error : level === 'WARN' ? originalConsole.warn : originalConsole.log;
  printer(lineText);
}

console.log = (...args) => writeLog('INFO', args);
console.warn = (...args) => writeLog('WARN', args);
console.error = (...args) => writeLog('ERROR', args);

process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection', reason);
});

process.on('uncaughtException', (err) => {
  console.error('uncaughtException', err);
});

console.log('日志输出已启用', {
  ENABLE_LOG,
  LOG_FILE_MODE,
  logFiles: CURRENT_LOG_FILES
});

let __reqSeq = 0;
function genReqId() {
  __reqSeq = (__reqSeq + 1) % 0x7fffffff;
  return `${Date.now().toString(36)}-${process.pid.toString(36)}-${__reqSeq.toString(36)}`;
}

// 认证配置（从环境变量读取）
const ENABLE_AUTH = process.env.ENABLE_AUTH === 'true'; // 默认关闭认证
const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || 'admin123';

console.log(`🔐 认证状态: ${ENABLE_AUTH ? '已启用' : '已禁用'}`);
if (ENABLE_AUTH) {
  console.log(`🔑 访问密码已设置 (通过环境变量 ACCESS_PASSWORD 修改)`);
}

// 中间件
app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));
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

// HTTP 访问日志：确保控制台与文件都同样详细，文件可额外保留结构化字段（jsonl）
app.use((req, res, next) => {
  const startNs = process.hrtime.bigint();
  const reqId = (req.headers['x-request-id'] && String(req.headers['x-request-id'])) || genReqId();
  req.reqId = reqId;
  res.setHeader('X-Request-Id', reqId);

  const ip = req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : (req.ip || req.connection?.remoteAddress);
  const ua = req.get('user-agent');
  const referer = req.get('referer');

  console.log('HTTP_IN', {
    reqId,
    method: req.method,
    path: req.originalUrl,
    ip,
    ua,
    referer
  });

  res.on('finish', () => {
    const durMs = Number(process.hrtime.bigint() - startNs) / 1e6;
    const len = res.getHeader('content-length');
    console.log('HTTP_OUT', {
      reqId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ms: Math.round(durMs * 100) / 100,
      bytes: len ? Number(len) : undefined
    });
  });

  next();
});

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
      req.path === '/convert' || req.path === '/convert/upload' || req.path === '/api/strip-proxies' || req.path.startsWith('/api/shortlink') ||
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

// 清理过期短链接
function cleanExpiredShortlinks() {
  const now = Date.now();
  const expireMs = SHORTLINK_EXPIRE_DAYS * 24 * 60 * 60 * 1000;
  let cleaned = 0;
  Object.keys(shortlinks).forEach(code => {
    const entry = shortlinks[code];
    if (!entry) return;
    const lastUsed = entry.lastUsed ? new Date(entry.lastUsed).getTime() : new Date(entry.createdAt).getTime();
    if (now - lastUsed > expireMs) {
      delete shortlinks[code];
      cleaned++;
    }
  });
  if (cleaned > 0) {
    saveShortlinks();
    console.log(`已清理 ${cleaned} 个过期短链接（超过 ${SHORTLINK_EXPIRE_DAYS} 天未使用）`);
  }
}

// 启动时清理一次
cleanExpiredShortlinks();

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

function extractDescription(code = '') {
  const lines = code.split(/\r?\n/);
  const descLines = [];
  let inBlock = false;
  let zh = '';
  let en = '';

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if ((descLines.length || zh || en) && !inBlock) break;
      continue;
    }

    const handleLine = (text) => {
      const match = text.match(/^([A-Za-z]{2}):\s*(.*)$/);
      if (match) {
        const tag = match[1].toLowerCase();
        const content = match[2].trim();
        if (tag === 'zh') zh = content;
        if (tag === 'en') en = content;
      } else {
        descLines.push(text.trim());
      }
    };

    if (line.startsWith('//')) {
      handleLine(line.replace(/^\/\/\s?/, ''));
      continue;
    }

    if (line.startsWith('/*')) {
      inBlock = true;
      const cleaned = line.replace(/^\/\*\s?/, '').replace(/\*\/$/, '').trim();
      if (cleaned) handleLine(cleaned);
      if (line.includes('*/')) {
        inBlock = false;
        break;
      }
      continue;
    }

    if (inBlock) {
      const cleaned = line.replace(/^\*\s?/, '').replace(/\*\/$/, '').trim();
      if (cleaned) handleLine(cleaned);
      if (line.includes('*/')) {
        inBlock = false;
        break;
      }
      continue;
    }

    if (descLines.length || zh || en) break;
    break;
  }

  const fallback = descLines.join(' ').trim() || undefined;
  const description = zh || en || fallback;
  return description ? { description, zh: zh || undefined, en: en || undefined } : undefined;
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
      const desc = extractDescription(code) || {};
      return {
        name,
        code,
        description: desc.description,
        descriptionZh: desc.zh,
        descriptionEn: desc.en
      };
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
    const desc = extractDescription(code) || {};
    res.json({
      name: scriptName,
      code,
      description: desc.description,
      descriptionZh: desc.zh,
      descriptionEn: desc.en
    });
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

function maybeDecodeBase64(text) {
  if (typeof text !== 'string') return text;
  const cleaned = text.trim();
  if (!cleaned || cleaned.length % 4 !== 0) return text;
  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(cleaned)) return text;
  try {
    const decoded = decodeBase64(cleaned.replace(/\r?\n/g, ''));
    // 判定是否主要是可打印字符
    const printable = decoded.split('').filter(ch => {
      const code = ch.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code < 127);
    }).length;
    if (decoded.length > 0 && printable / decoded.length > 0.85) {
      console.log('检测到 Base64，已解码');
      return decoded;
    }
  } catch (e) {
    // ignore decode errors
  }
  return text;
}

function decodeBase64Strict(text) {
  if (typeof text !== 'string') {
    throw new Error('内容格式无效');
  }
  const cleaned = text.trim();
  if (!cleaned) {
    throw new Error('内容为空');
  }
  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(cleaned)) {
    throw new Error('内容不是有效的 Base64');
  }
  try {
    return Buffer.from(cleaned.replace(/\r?\n/g, ''), 'base64').toString('utf-8');
  } catch (e) {
    throw new Error('Base64 解码失败');
  }
}

function stripToProxiesOnly(content) {
  let config;
  try {
    config = JSON.parse(content);
  } catch (_) {
    try {
      config = yaml.load(content);
    } catch (e) {
      throw new Error('内容不是有效的配置格式');
    }
  }
  if (!config || typeof config !== 'object') {
    throw new Error('配置格式无效');
  }
  const proxies = Array.isArray(config.proxies) ? config.proxies : [];
  if (!proxies.length) {
    throw new Error('未找到可用的节点信息');
  }
  return yaml.dump({ proxies }, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false
  });
}

// ==================== 订阅转换核心功能 ====================

// ==================== 短链接功能 ====================

// 创建短链接
app.post('/api/shortlink', (req, res) => {
  try {
    const { url, script, sub, filename, data } = req.body || {};
    let target = url;
    let conversionParams = null;

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

    // 检测是否是 /convert 请求，如果是则存储参数而非 URL
    try {
      const urlObj = new URL(target);
      if (urlObj.pathname === '/convert' || urlObj.pathname.endsWith('/convert')) {
        const context = urlObj.searchParams.get('context');
        const sub = urlObj.searchParams.get('sub');
        const scriptParam = urlObj.searchParams.get('script');
        const data = urlObj.searchParams.get('data');
        
        if (scriptParam && (context || sub || data)) {
          conversionParams = {
            script: scriptParam,
            context: context || undefined,
            sub: sub || undefined,
            data: data || undefined,
            filename: urlObj.searchParams.get('filename') || undefined,
            proxiesOnly: urlObj.searchParams.get('proxiesOnly') === '1' || urlObj.searchParams.get('proxiesOnly') === 'true'
          };
          console.log('检测到 /convert 请求，将直接存储转换参数而非重定向 URL');
        }
      }
    } catch (e) {
      // ignore parse errors
    }

    // 查找现有短链接（基于参数或 URL）
    const existing = Object.entries(shortlinks).find(([, value]) => {
      if (conversionParams && value.conversionParams) {
        const v = value.conversionParams;
        const c = conversionParams;
        return v.script === c.script &&
               v.context === c.context &&
               v.sub === c.sub &&
               v.data === c.data;
      }
      return value.url === target;
    });
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

    const entry = {
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    };
    if (conversionParams) {
      entry.conversionParams = conversionParams;
    } else {
      entry.url = target;
    }
    shortlinks[code] = entry;
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

// 仅保留节点的精简接口（供前端生成更短的 Base64 链接）
app.post('/api/strip-proxies', (req, res) => {
  try {
    const { contentBase64 } = req.body || {};
    if (!contentBase64) {
      return res.status(400).json({ error: '缺少必要参数: contentBase64' });
    }
    const decoded = decodeBase64Strict(contentBase64);
    const stripped = stripToProxiesOnly(decoded);
    const encoded = encodeBase64(stripped);
    res.json({ contentBase64: encoded, length: stripped.length });
  } catch (error) {
    res.status(400).json({ error: error.message || '处理失败' });
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

// 访问短链接（重定向或直接转换）
app.get('/s/:code', async (req, res) => {
  const { code } = req.params;
  const entry = shortlinks[code];
  if (!entry) {
    return res.status(404).send('Short link not found');
  }
  // 更新最后使用时间
  entry.lastUsed = new Date().toISOString();
  saveShortlinks();

  // 如果存储的是转换参数，直接处理并返回结果
  if (entry.conversionParams) {
    try {
      const { script, context, sub, data, filename, proxiesOnly } = entry.conversionParams;
      const convertStart = Date.now();

      // 解析参数（支持 data 编码）
      let actualScript = script;
      let actualSub = sub;
      let actualContext = context;
      let actualFilename = filename;
      
      if (data && !actualSub && !actualContext) {
        try {
          const decoded = decodeBase64(decodeURIComponent(data));
          const params = new URLSearchParams(decoded);
          actualScript = params.get('script') || actualScript;
          actualSub = params.get('sub');
          actualFilename = params.get('filename') || actualFilename;
        } catch (e) {
          return res.status(400).json({ error: '无效的编码数据' });
        }
      }

      if (!actualScript || (!actualSub && !actualContext)) {
        return res.status(400).json({ error: '短链接参数不完整' });
      }

      const scriptPath = path.join(scriptsDir, `${actualScript}.js`);
      if (!fs.existsSync(scriptPath)) {
        console.error('短链接转换错误 脚本不存在', { script: actualScript, code });
        return res.status(404).json({ error: `脚本 "${actualScript}" 不存在` });
      }

      let content;
      if (actualContext) {
        try {
          content = decodeBase64Strict(actualContext);
          console.log('短链接转换，使用 context 直接处理', code);
        } catch (e) {
          return res.status(400).json({ error: e.message || 'context 解码失败' });
        }
      } else {
        // 获取订阅内容
        content = await fetchSubscription(actualSub);
        content = maybeDecodeBase64(content);
        console.log('短链接转换，从订阅源获取', code, actualSub);
      }

      if (proxiesOnly) {
        try {
          content = stripToProxiesOnly(content);
          console.log('短链接转换：已按请求仅保留节点信息');
        } catch (e) {
          return res.status(400).json({ error: e.message });
        }
      }

      const scriptCode = fs.readFileSync(scriptPath, 'utf8');
      const processed = executeScript(content, scriptCode);

      let finalName = actualFilename || 'subscription.yaml';
      const looksLikeIni = typeof processed === 'string' && /^\s*\[General\]/m.test(processed);
      if (looksLikeIni && (!actualFilename || actualFilename === 'subscription.yaml')) {
        finalName = 'subscription.conf';
      }

      const contentType = looksLikeIni ? 'text/plain; charset=utf-8' : 'text/yaml; charset=utf-8';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(finalName)}`);
      res.send(processed);
      console.log('短链接转换完成', { code, script: actualScript, filename: finalName, bytes: (processed && processed.length) || 0, ms: Date.now() - convertStart, contentType });
    } catch (error) {
      console.error('短链接转换错误', error.message, error.stack);
      res.status(500).json({ error: error.message });
    }
  } else {
    // 旧格式：尝试解析 URL 提取参数,直接处理转换
    try {
      const urlObj = new URL(entry.url);
      if (urlObj.pathname === '/convert') {
        // 提取查询参数
        const params = {
          script: urlObj.searchParams.get('script'),
          context: urlObj.searchParams.get('context'),
          sub: urlObj.searchParams.get('sub'),
          data: urlObj.searchParams.get('data'),
          filename: urlObj.searchParams.get('filename') || 'config.yaml',
          proxiesOnly: urlObj.searchParams.get('proxiesOnly') === 'true'
        };
        
        console.log('短链接(旧格式)访问:', code, '提取参数:', params);
        
        // 直接处理转换
        let config;
        if (params.context) {
          // 本地文件上传
          const decodedConfig = decodeBase64Strict(params.context);
          config = params.proxiesOnly ? stripToProxiesOnly(decodedConfig) : decodedConfig;
        } else if (params.sub) {
          // 远程订阅
          const subContent = await fetchSubscription(decodeBase64(params.sub));
          config = params.proxiesOnly ? stripToProxiesOnly(subContent) : subContent;
        } else if (params.data) {
          const decodedData = decodeBase64(params.data);
          config = params.proxiesOnly ? stripToProxiesOnly(decodedData) : decodedData;
        } else {
          res.status(400).send('缺少必要参数');
          return;
        }
        
        const scriptPath = path.join(__dirname, 'data', 'scripts', `${params.script}.js`);
        const scriptModule = await import(pathToFileURL(scriptPath).href);
        const processedConfig = await scriptModule.default(config);
        
        res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${params.filename}"`);
        res.send(processedConfig);
        
        console.log('短链接(旧格式)转换完成:', code);
      } else {
        // 不是 /convert 路径,直接重定向
        res.redirect(302, entry.url);
      }
    } catch (err) {
      console.error('旧格式短链接处理失败:', err);
      // 兜底：尝试直接重定向
      res.redirect(302, entry.url);
    }
  }
});

// 获取原始订阅内容
async function fetchSubscription(url, retries = 2, timeoutMs = 30000) {
  const urlObj = new URL(url);
  const isGitHubRaw = urlObj.hostname.includes('raw.githubusercontent.com');
  
  // 对于 GitHub raw 内容，使用 45s 超时且确保 2 次重试
  const finalTimeout = isGitHubRaw ? 45000 : timeoutMs;
  const finalRetries = isGitHubRaw ? Math.max(retries, 2) : retries;

  const attempt = async (retriesLeft) => {
    const start = Date.now();
    console.log('开始获取订阅', url, `剩余重试=${retriesLeft}`);

    try {
      // 配置代理（axios 会自动读取 HTTP_PROXY/HTTPS_PROXY 环境变量）
      const config = {
        headers: { 
          'User-Agent': 'clash-verge/v1.3.8'
        },
        timeout: finalTimeout,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 300
      };

      // 明确设置代理（支持环境变量）
      if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
        const proxyUrl = urlObj.protocol === 'https:' 
          ? (process.env.HTTPS_PROXY || process.env.HTTP_PROXY)
          : (process.env.HTTP_PROXY || process.env.HTTPS_PROXY);
        
        if (proxyUrl) {
          const proxyObj = new URL(proxyUrl);
          config.proxy = {
            host: proxyObj.hostname,
            port: parseInt(proxyObj.port) || 80,
            protocol: proxyObj.protocol.replace(':', '')
          };
          console.log('使用代理:', `${config.proxy.protocol}://${config.proxy.host}:${config.proxy.port}`);
        }
      }

      const response = await axios.get(url, config);

      console.log('获取订阅成功', url, `status=${response.status}`, `bytes=${response.data.length}`, `耗时=${Date.now()-start}ms`);
      return response.data;

    } catch (error) {
      const elapsed = Date.now() - start;
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        console.error('请求超时', url, `耗时=${elapsed}ms`);
      } else if (error.response) {
        console.error('获取订阅失败', url, `status=${error.response.status}`, error.response.statusText, `耗时=${elapsed}ms`);
      } else {
        console.error('请求失败', url, error.message, `耗时=${elapsed}ms`);
      }

      const nextRetries = retriesLeft - 1;
      if (nextRetries > 0) {
        const reason = error.code === 'ECONNABORTED' ? '获取订阅超时' : `获取订阅失败: ${error.message}`;
        console.warn('请求失败，准备重试:', reason, `剩余重试=${nextRetries}`);
        await new Promise(resolve => setTimeout(resolve, 1200));
        return attempt(nextRetries);
      } else {
        console.error('所有重试均失败，放弃', url, error.message);
        throw error;
      }
    }
  };

  return attempt(finalRetries);
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
    const convertStart = Date.now();
    let script = req.query.script;
    let sub = req.query.sub;
    let filename = req.query.filename;
    let context = req.query.context;
    const proxiesOnly = req.query.proxiesOnly === '1' || req.query.proxiesOnly === 'true';
    
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
    
    if (!script || (!sub && !context)) {
      return res.status(400).json({ error: '缺少必要参数: script，且需要 sub 或 context' });
    }
    
    // 设置默认文件名
    if (!filename) {
      filename = 'subscription.yaml';
    }
    
    // 确保 sub 是正确解码的 URL
    // Express 已经自动解码了 query 参数，但如果是从 Base64 来的，需要再解码一次
    if (sub) console.log('原始 sub:', sub);
    
    // 读取脚本
    let scriptCode = '';
    const scriptPath = path.join(scriptsDir, `${script}.js`);
    if (fs.existsSync(scriptPath)) {
      scriptCode = fs.readFileSync(scriptPath, 'utf8');
    } else {
      console.error('转换错误 脚本不存在', { script, sub, filename });
      return res.status(404).json({ error: `脚本 "${script}" 不存在` });
    }
    
    let content;
    if (context) {
      try {
        content = decodeBase64Strict(context);
        console.log('使用 context 直接转换，跳过外部拉取');
      } catch (e) {
        return res.status(400).json({ error: e.message || 'context 解码失败' });
      }
    } else {
      content = await fetchSubscription(sub);
      content = maybeDecodeBase64(content);
    }

    if (proxiesOnly) {
      try {
        content = stripToProxiesOnly(content);
        console.log('已按请求仅保留节点信息');
      } catch (e) {
        return res.status(400).json({ error: e.message });
      }
    }
    
    // 执行脚本处理
    const processed = executeScript(content, scriptCode);
    const looksLikeIni = typeof processed === 'string' && /^\s*\[General\]/m.test(processed);
    if (looksLikeIni && (!filename || filename === 'subscription.yaml')) {
      filename = 'subscription.conf';
    }

    const contentType = looksLikeIni ? 'text/plain; charset=utf-8' : 'text/yaml; charset=utf-8';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(processed);
    console.log('转换完成', { script, sub, filename, bytes: (processed && processed.length) || 0, ms: Date.now() - convertStart, contentType });
    
  } catch (error) {
    console.error('转换错误', error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
});

// 本地文件转换（通过 Base64 上传，不发起外部请求）
app.post('/convert/upload', async (req, res) => {
  try {
    const convertStart = Date.now();
    const { script, contentBase64, filename, proxiesOnly } = req.body || {};

    if (!script || !contentBase64) {
      return res.status(400).json({ error: '缺少必要参数: script 和 contentBase64' });
    }

    const scriptPath = path.join(scriptsDir, `${script}.js`);
    if (!fs.existsSync(scriptPath)) {
      console.error('上传转换错误 脚本不存在', { script });
      return res.status(404).json({ error: `脚本 "${script}" 不存在` });
    }

    let rawContent;
    try {
      rawContent = decodeBase64Strict(contentBase64);
    } catch (e) {
      console.error('上传内容解码失败', e.message);
      return res.status(400).json({ error: e.message || 'Base64 解码失败' });
    }

    if (proxiesOnly) {
      try {
        rawContent = stripToProxiesOnly(rawContent);
        console.log('上传转换：已仅保留节点信息');
      } catch (e) {
        return res.status(400).json({ error: e.message });
      }
    }

    const scriptCode = fs.readFileSync(scriptPath, 'utf8');
    const processed = executeScript(rawContent, scriptCode);

    let finalName = filename || 'subscription.yaml';
    const looksLikeIni = typeof processed === 'string' && /^\s*\[General\]/m.test(processed);
    if (looksLikeIni && (!filename || filename === 'subscription.yaml')) {
      finalName = 'subscription.conf';
    }

    const contentType = looksLikeIni ? 'text/plain; charset=utf-8' : 'text/yaml; charset=utf-8';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(finalName)}`);
    res.send(processed);
    console.log('上传转换完成', { script, filename: finalName, bytes: (processed && processed.length) || 0, ms: Date.now() - convertStart, contentType });
  } catch (error) {
    console.error('上传转换错误', error.message, error.stack);
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
