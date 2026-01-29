// ZH: 地区优先脚本：无需远程规则，自动识别 HK/SG/JP/US 节点 url-test 选优，CN 直连，提供手动/自动/兜底策略
// EN: Geo-priority script: no remote rules, auto-detect HK/SG/JP/US with url-test best pick, CN direct, provides manual/auto/fallback groups

// GEO Priority - 优先直连中国，分流常见区域节点
// - 自动构建地区测速分组（HK/SG/JP/US）
// - 兜底策略组与直连

const testUrl = 'http://www.gstatic.com/generate_204';

function pick(names, regex) {
  const hit = names.filter(n => regex.test(n));
  return hit.length ? hit : ['DIRECT'];
}

function main(config) {
  const proxies = config.proxies || [];
  const names = proxies.map(p => p && p.name).filter(Boolean);
  if (!names.length) return config;

  const regions = {
    '🇭🇰 香港节点': /HK|Hong|香港/i,
    '🇸🇬 狮城节点': /SG|Singapore|狮城/i,
    '🇯🇵 日本节点': /JP|Japan|日本/i,
    '🇺🇲 美国节点': /US|United|美国/i
  };

  const regionTests = Object.entries(regions).map(([label, re]) => ({
    name: label,
    type: 'url-test',
    url: testUrl,
    interval: 300,
    tolerance: 100,
    proxies: pick(names, re)
  }));

  const allChoices = ['♻️ 自动选择', ...Object.keys(regions), '🚀 手动切换', 'DIRECT'];

  config['proxy-groups'] = [
    { name: '🚀 节点选择', type: 'select', proxies: allChoices },
    { name: '🚀 手动切换', type: 'select', proxies: names },
    { name: '♻️ 自动选择', type: 'url-test', url: testUrl, interval: 300, tolerance: 80, proxies: names },
    ...regionTests,
    { name: '🎯 全球直连', type: 'select', proxies: ['DIRECT', '🚀 节点选择'] },
    { name: '🐟 漏网之鱼', type: 'select', proxies: ['🚀 节点选择', 'DIRECT'] }
  ];

  config.rules = [
    'DOMAIN-SUFFIX,local,DIRECT',
    'IP-CIDR,127.0.0.0/8,DIRECT,no-resolve',
    'GEOIP,CN,🎯 全球直连',
    'MATCH,🐟 漏网之鱼'
  ];

  return config;
}
