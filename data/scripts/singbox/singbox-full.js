// ZH: SingBox 完整配置脚本：支持直接修改 SingBox JSON 配置，包含分流规则、策略组、DNS 等完整功能
// EN: Full SingBox configuration script: supports direct modification of SingBox JSON config with routing rules, policy groups, DNS, etc.

const path = require('path');
const converterPath = path.join(__dirname, '../../utils/singbox-converter.js');
const { clashToSingBox, singBoxToClash, detectConfigType } = require(converterPath);

/**
 * 主函数：处理 SingBox 配置
 * 支持：
 * 1. 直接修改 SingBox JSON 配置
 * 2. Clash YAML 转 SingBox JSON
 */
function main(config) {
  // 检测配置类型
  const configType = detectConfigType(config);
  
  let singboxConfig;
  
  if (configType === 'clash') {
    // Clash 配置转 SingBox
    console.log('检测到 Clash 配置，正在转换为 SingBox 格式...');
    singboxConfig = clashToSingBox(config);
  } else if (configType === 'singbox') {
    // 已经是 SingBox 配置
    singboxConfig = typeof config === 'string' ? JSON.parse(config) : config;
  } else {
    throw new Error('无法识别的配置格式，仅支持 Clash YAML 或 SingBox JSON');
  }

  // ========== 自定义规则集 ==========
  const customRuleProviders = {
    reject: {
      type: 'remote',
      behavior: 'domain',
      url: 'https://github.com/666OS/rules/raw/release/singbox/domain/Advertising.srs',
      download_detour: 'DIRECT'
    },
    direct: {
      type: 'remote',
      behavior: 'domain',
      url: 'https://github.com/666OS/rules/raw/release/singbox/domain/Direct.srs',
      download_detour: 'DIRECT'
    },
    private: {
      type: 'remote',
      behavior: 'domain',
      url: 'https://github.com/666OS/rules/raw/release/singbox/domain/Private.srs',
      download_detour: 'DIRECT'
    },
    apple: {
      type: 'remote',
      behavior: 'domain',
      url: 'https://github.com/666OS/rules/raw/release/singbox/domain/Apple.srs',
      download_detour: 'DIRECT'
    },
    google: {
      type: 'remote',
      behavior: 'domain',
      url: 'https://github.com/666OS/rules/raw/release/singbox/domain/Google.srs',
      download_detour: 'PROXY'
    },
    proxy: {
      type: 'remote',
      behavior: 'domain',
      url: 'https://github.com/666OS/rules/raw/release/singbox/domain/Proxy.srs',
      download_detour: 'PROXY'
    },
    streaming: {
      type: 'remote',
      behavior: 'domain',
      url: 'https://github.com/666OS/rules/raw/release/singbox/domain/Streaming.srs',
      download_detour: 'PROXY'
    },
    china: {
      type: 'remote',
      behavior: 'domain',
      url: 'https://github.com/666OS/rules/raw/release/singbox/domain/China.srs',
      download_detour: 'DIRECT'
    }
  };

  // ========== 构建策略组 ==========
  const proxyNodes = singboxConfig.outbounds.filter(o => 
    !['direct', 'block', 'dns', 'selector', 'urltest', 'fallback'].includes(o.type)
  );
  const proxyNames = proxyNodes.map(p => p.tag);

  // 移除旧的策略组（保留节点和基础出站）
  singboxConfig.outbounds = singboxConfig.outbounds.filter(o => 
    o.type === 'direct' || o.type === 'block' || o.type === 'dns' || 
    !['selector', 'urltest', 'fallback'].includes(o.type)
  );

  // 添加新策略组
  const policyGroups = [
    {
      type: 'selector',
      tag: '🚀 策略选择',
      outbounds: ['♻️ 自动选择', '🎯 全球直连', ...proxyNames]
    },
    {
      type: 'urltest',
      tag: '♻️ 自动选择',
      outbounds: proxyNames,
      url: 'https://www.gstatic.com/generate_204',
      interval: '300s',
      tolerance: 50
    },
    {
      type: 'selector',
      tag: '📲 电报消息',
      outbounds: ['🚀 策略选择', '♻️ 自动选择', '🎯 全球直连', ...proxyNames]
    },
    {
      type: 'selector',
      tag: '📹 YouTube',
      outbounds: ['🚀 策略选择', '♻️ 自动选择', '🎯 全球直连', ...proxyNames]
    },
    {
      type: 'selector',
      tag: '🎥 Netflix',
      outbounds: ['🚀 策略选择', '♻️ 自动选择', '🎯 全球直连', ...proxyNames]
    },
    {
      type: 'selector',
      tag: '🎬 国际媒体',
      outbounds: ['🚀 策略选择', '♻️ 自动选择', '🎯 全球直连', ...proxyNames]
    },
    {
      type: 'selector',
      tag: '🍎 Apple',
      outbounds: ['🎯 全球直连', '🚀 策略选择', '♻️ 自动选择', ...proxyNames]
    },
    {
      type: 'selector',
      tag: '🎯 全球直连',
      outbounds: ['DIRECT', '🚀 策略选择', '♻️ 自动选择']
    },
    {
      type: 'selector',
      tag: '🛑 广告拦截',
      outbounds: ['REJECT', 'DIRECT', '🚀 策略选择']
    },
    {
      type: 'selector',
      tag: '🐟 漏网之鱼',
      outbounds: ['🚀 策略选择', '♻️ 自动选择', '🎯 全球直连', ...proxyNames]
    }
  ];

  // 插入策略组到 outbounds
  singboxConfig.outbounds.splice(3, 0, ...policyGroups);

  // ========== 配置 DNS ==========
  singboxConfig.dns = {
    servers: [
      {
        tag: 'dns_proxy',
        address: 'tls://8.8.8.8',
        address_resolver: 'dns_resolver',
        strategy: 'prefer_ipv4'
      },
      {
        tag: 'dns_direct',
        address: 'h3://dns.alidns.com/dns-query',
        address_resolver: 'dns_resolver',
        detour: 'DIRECT',
        strategy: 'prefer_ipv4'
      },
      {
        tag: 'dns_block',
        address: 'rcode://success'
      },
      {
        tag: 'dns_resolver',
        address: '223.5.5.5',
        detour: 'DIRECT'
      }
    ],
    rules: [
      {
        outbound: 'any',
        server: 'dns_resolver'
      },
      {
        rule_set: ['reject'],
        server: 'dns_block'
      },
      {
        rule_set: ['proxy', 'google', 'streaming'],
        server: 'dns_proxy'
      },
      {
        rule_set: ['china', 'direct', 'private'],
        server: 'dns_direct'
      }
    ],
    final: 'dns_direct',
    independent_cache: true
  };

  // ========== 配置路由规则 ==========
  if (!singboxConfig.route) {
    singboxConfig.route = {};
  }

  // 添加规则集
  singboxConfig.route.rule_set = Object.entries(customRuleProviders).map(([name, config]) => ({
    tag: name,
    type: 'remote',
    format: 'binary',
    url: config.url,
    download_detour: config.download_detour
  }));

  // 配置路由规则
  singboxConfig.route.rules = [
    // 广告拦截
    {
      rule_set: ['reject'],
      outbound: '🛑 广告拦截'
    },
    // 私有网络
    {
      rule_set: ['private'],
      outbound: '🎯 全球直连'
    },
    // Apple 服务
    {
      rule_set: ['apple'],
      outbound: '🍎 Apple'
    },
    // Google 服务
    {
      rule_set: ['google'],
      outbound: '🚀 策略选择'
    },
    // 流媒体
    {
      rule_set: ['streaming'],
      outbound: '🎬 国际媒体'
    },
    // 代理
    {
      rule_set: ['proxy'],
      outbound: '🚀 策略选择'
    },
    // 直连
    {
      rule_set: ['direct', 'china'],
      outbound: '🎯 全球直连'
    },
    // 国内 IP
    {
      geoip: ['cn'],
      outbound: '🎯 全球直连'
    }
  ];

  singboxConfig.route.final = '🐟 漏网之鱼';
  singboxConfig.route.auto_detect_interface = true;

  // ========== 实验性功能 ==========
  if (!singboxConfig.experimental) {
    singboxConfig.experimental = {};
  }

  singboxConfig.experimental.cache_file = {
    enabled: true,
    store_fakeip: true
  };

  singboxConfig.experimental.clash_api = {
    external_controller: '127.0.0.1:9090',
    external_ui: 'dashboard',
    external_ui_download_url: 'https://github.com/MetaCubeX/Yacd-meta/archive/gh-pages.zip',
    external_ui_download_detour: 'DIRECT',
    default_mode: 'rule'
  };

  // 返回 SingBox 配置对象（会被自动转换为 JSON）
  return singboxConfig;
}

module.exports = main;
