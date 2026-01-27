// ACL Lite - 轻量级分流配置脚本
// 功能：参考 ACL4SSR 规则的精简版，包含广告拦截、GFW 代理、中国域名直连、流媒体和电报分流
// 特点：策略组精简，规则集在线获取，适合一般用户日常使用

// ACL Lite - 参考 subconverter 思路的精简版分流
// - 注入常用在线规则集（广告 / GFW / 中国域名）
// - 构建基础策略组：节点选择、自动测速、流媒体、电报、直连、兜底
// - 如果没有节点则直接返回原配置

const ruleProviderCommon = { type: 'http', behavior: 'domain', format: 'yaml', interval: 86400 };
const ruleProviders = {
  reject: { ...ruleProviderCommon, url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/Reject.yaml', path: './ruleset/acl/reject.yaml' },
  gfw: { ...ruleProviderCommon, url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/GFW.yaml', path: './ruleset/acl/gfw.yaml' },
  cn: { ...ruleProviderCommon, url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/ChinaDomain.yaml', path: './ruleset/acl/cn.yaml' },
  media: { ...ruleProviderCommon, url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/GlobalMedia.yaml', path: './ruleset/acl/media.yaml' },
  telegram: { ...ruleProviderCommon, behavior: 'ipcidr', url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/Telegram.yaml', path: './ruleset/acl/telegram.yaml' }
};

const urlTestBase = { type: 'url-test', url: 'http://www.gstatic.com/generate_204', interval: 300, tolerance: 100 };

function main(config) {
  const proxies = config.proxies || [];
  const proxyNames = proxies.map(p => p && p.name).filter(Boolean);
  if (proxyNames.length === 0) return config;

  config['rule-providers'] = ruleProviders;

  const autoAll = { ...urlTestBase, name: '♻️ 自动选择', proxies: proxyNames };
  const groups = [
    { name: '🚀 节点选择', type: 'select', proxies: ['♻️ 自动选择', 'DIRECT', ...proxyNames] },
    autoAll,
    { name: '📺 国外媒体', type: 'select', proxies: ['🚀 节点选择', '♻️ 自动选择', 'DIRECT'] },
    { name: '📟 电报消息', type: 'select', proxies: ['🚀 节点选择', '♻️ 自动选择', 'DIRECT'] },
    { name: '🎯 全球直连', type: 'select', proxies: ['DIRECT', '🚀 节点选择'] },
    { name: '🐟 漏网之鱼', type: 'select', proxies: ['🚀 节点选择', '♻️ 自动选择', 'DIRECT'] }
  ];

  config['proxy-groups'] = groups;
  config.rules = [
    'RULE-SET,reject,REJECT',
    'RULE-SET,telegram,📟 电报消息',
    'RULE-SET,media,📺 国外媒体',
    'RULE-SET,gfw,🚀 节点选择',
    'RULE-SET,cn,🎯 全球直连',
    'GEOIP,CN,🎯 全球直连',
    'MATCH,🐟 漏网之鱼'
  ];

  // DNS 兜底
  config.dns = config.dns || {};
  config.dns.enable = config.dns.enable ?? true;
  config.dns.nameserver = config.dns.nameserver || ['119.29.29.29', '223.5.5.5'];
  config.dns.fallback = config.dns.fallback || ['8.8.8.8', '1.1.1.1'];

  return config;
}
