// ZH: 极简 ACL 分流：仅广告拒绝/GFW 代理/中国直连三大规则，节点选择+自动测速+直连兜底，最少策略组适合轻量订阅
// EN: Minimal ACL routing: only ad-reject/GFW proxy/CN direct rules with selector+url-test+direct fallback; minimal groups for lightweight use

// ACL Mini - 极简分流：广告拒绝 + GFW 走代理 + 中国域名直连
// 适合轻量订阅，策略组保持最少

const ruleProviderCommon = { type: 'http', behavior: 'domain', format: 'yaml', interval: 86400 };
const ruleProviders = {
  reject: { ...ruleProviderCommon, url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/Reject.yaml', path: './ruleset/mini/reject.yaml' },
  gfw: { ...ruleProviderCommon, url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/GFW.yaml', path: './ruleset/mini/gfw.yaml' },
  cn: { ...ruleProviderCommon, url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/ChinaDomain.yaml', path: './ruleset/mini/cn.yaml' }
};

function main(config) {
  const proxies = config.proxies || [];
  const proxyNames = proxies.map(p => p && p.name).filter(Boolean);
  if (proxyNames.length === 0) return config;

  config['rule-providers'] = ruleProviders;

  config['proxy-groups'] = [
    { name: '🚀 节点选择', type: 'select', proxies: ['♻️ 自动选择', ...proxyNames, 'DIRECT'] },
    { name: '♻️ 自动选择', type: 'url-test', url: 'http://www.gstatic.com/generate_204', interval: 300, tolerance: 150, proxies: proxyNames },
    { name: '🎯 全球直连', type: 'select', proxies: ['DIRECT', '🚀 节点选择'] },
    { name: '🐟 漏网之鱼', type: 'select', proxies: ['🚀 节点选择', 'DIRECT'] }
  ];

  config.rules = [
    'RULE-SET,reject,REJECT',
    'RULE-SET,gfw,🚀 节点选择',
    'RULE-SET,cn,🎯 全球直连',
    'GEOIP,CN,🎯 全球直连',
    'MATCH,🐟 漏网之鱼'
  ];

  return config;
}
