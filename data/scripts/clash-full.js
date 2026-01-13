// =========================================================
// Clash 完整配置处理脚本示例
// 支持 Clash 配置对象格式，无需适配
// =========================================================

// 在线规则集
const remoteProviders = {
  "ad": "https://cdn.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Providers/BanAD.yaml",
  "app": "https://cdn.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Providers/BanProgramAD.yaml",
  "gfwlist": "https://cdn.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Providers/ProxyGFWlist.yaml",
  "chinaDomain": "https://cdn.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Providers/ChinaDomain.yaml",
  "chinaIp": "https://cdn.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Providers/ChinaIp.yaml"
};

// 静态规则
const rawRules = [
  // 基础规则
  "DOMAIN-SUFFIX,local,DIRECT",
  "IP-CIDR,127.0.0.0/8,DIRECT,no-resolve",
  "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
  
  // AI 平台
  "DOMAIN-KEYWORD,openai,🤖 ChatGPT",
  "DOMAIN-SUFFIX,chatgpt.com,🤖 ChatGPT",
  "DOMAIN-SUFFIX,openai.com,🤖 ChatGPT",
  
  "DOMAIN-SUFFIX,gemini.google.com,🧠 Gemini",
  "DOMAIN-SUFFIX,bard.google.com,🧠 Gemini",
  
  "DOMAIN-SUFFIX,copilot.microsoft.com,✈️ Copilot",
  
  // 流媒体
  "DOMAIN-KEYWORD,youtube,📹 油管视频",
  "DOMAIN-SUFFIX,youtube.com,📹 油管视频",
  "DOMAIN-KEYWORD,netflix,🎥 奈飞视频",
  "DOMAIN-SUFFIX,netflix.com,🎥 奈飞视频",
  
  // 社交
  "DOMAIN-SUFFIX,telegram.org,📲 电报消息",
  "IP-CIDR,91.108.0.0/16,📲 电报消息,no-resolve",
  
  // 微软
  "DOMAIN-SUFFIX,bing.com,Ⓜ️ 微软Bing",
  "DOMAIN-SUFFIX,onedrive.com,Ⓜ️ 微软云盘",
  "DOMAIN-KEYWORD,microsoft,Ⓜ️ 微软服务",
  
  // 苹果
  "DOMAIN-SUFFIX,apple.com,🍎 苹果服务",
  "DOMAIN-SUFFIX,icloud.com,🍎 苹果服务",
  
  // 兜底
  "GEOIP,CN,🎯 全球直连",
  "MATCH,🐟 漏网之鱼"
];

function main(config) {
  const proxies = config.proxies || [];

  // 过滤节点
  const excludeKeywords = ["过期", "剩余", "套餐", "官网", "测试"];
  const baseProxyNames = proxies
    .map(p => p && p.name)
    .filter(Boolean)
    .filter(name => !excludeKeywords.some(kw => name.includes(kw)));

  if (baseProxyNames.length === 0) return config;

  // 注入在线规则
  config["rule-providers"] = {
    "ad_rule": {
      type: "http",
      behavior: "classical",
      url: remoteProviders.ad,
      path: "./ruleset/ad.yaml",
      interval: 86400
    },
    "gfwlist_rule": {
      type: "http",
      behavior: "classical",
      url: remoteProviders.gfwlist,
      path: "./ruleset/gfwlist.yaml",
      interval: 86400
    }
  };

  // 辅助函数：按正则筛选节点
  const getProxiesByRegex = (regex) => {
    const matched = baseProxyNames.filter(n => regex.test(n));
    return matched.length > 0 ? matched : ["DIRECT"];
  };

  // 定义策略组
  const groups = [
    {
      name: "🚀 节点选择",
      type: "select",
      proxies: ["♻️ 自动选择", "🇭🇰 香港节点", "🇺🇲 美国节点", "DIRECT"]
    },
    {
      name: "♻️ 自动选择",
      type: "url-test",
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      proxies: baseProxyNames
    },
    {
      name: "🤖 ChatGPT",
      type: "select",
      proxies: ["🚀 节点选择", ...baseProxyNames, "DIRECT"]
    },
    {
      name: "🧠 Gemini",
      type: "select",
      proxies: ["🚀 节点选择", ...baseProxyNames, "DIRECT"]
    },
    {
      name: "✈️ Copilot",
      type: "select",
      proxies: ["🚀 节点选择", ...baseProxyNames, "DIRECT"]
    },
    {
      name: "📹 油管视频",
      type: "select",
      proxies: ["🚀 节点选择", ...baseProxyNames]
    },
    {
      name: "🎥 奈飞视频",
      type: "select",
      proxies: ["🚀 节点选择", ...baseProxyNames]
    },
    {
      name: "📲 电报消息",
      type: "select",
      proxies: ["🚀 节点选择", ...baseProxyNames]
    },
    {
      name: "Ⓜ️ 微软Bing",
      type: "select",
      proxies: ["DIRECT", "🚀 节点选择"]
    },
    {
      name: "Ⓜ️ 微软云盘",
      type: "select",
      proxies: ["DIRECT", "🚀 节点选择"]
    },
    {
      name: "Ⓜ️ 微软服务",
      type: "select",
      proxies: ["DIRECT", "🚀 节点选择"]
    },
    {
      name: "🍎 苹果服务",
      type: "select",
      proxies: ["DIRECT", "🚀 节点选择"]
    },
    {
      name: "🎯 全球直连",
      type: "select",
      proxies: ["DIRECT", "🚀 节点选择"]
    },
    {
      name: "🐟 漏网之鱼",
      type: "select",
      proxies: ["🚀 节点选择", "DIRECT"]
    },
    {
      name: "🇭🇰 香港节点",
      type: "url-test",
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      proxies: getProxiesByRegex(/HK|Hong|香港/)
    },
    {
      name: "🇺🇲 美国节点",
      type: "url-test",
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      proxies: getProxiesByRegex(/US|America|美国/)
    }
  ];

  config["proxy-groups"] = groups;

  // 组合规则
  const finalRules = [
    "RULE-SET,ad_rule,REJECT",
    ...rawRules.slice(0, -1),
    "RULE-SET,gfwlist_rule,🚀 节点选择",
    rawRules[rawRules.length - 1]
  ];

  config.rules = finalRules;

  // DNS 配置
  if (!config.dns) config.dns = {};
  config.dns.enable = true;
  config.dns.nameserver = config.dns.nameserver || ["119.29.29.29", "223.5.5.5"];
  config.dns.fallback = config.dns.fallback || ["8.8.8.8", "1.1.1.1"];

  return config;
}
