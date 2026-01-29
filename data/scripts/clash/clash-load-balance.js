// ZH: 负载均衡脚本（AI 合并）：在线全规则，自动/散列/轮询三模式，地区分组＋应用/媒体/AI 合并组，附 DNS/嗅探/认证
// EN: Load-balance script (AI merged): full online rules, auto/consistent-hash/round-robin modes, regional plus app/media/AI merged groups, with DNS/sniffer/auth

// =========================================================
// 1. 在线规则集配置
// =========================================================
const remoteProviders = {
  // 域名规则集
  tracking: "https://github.com/666OS/rules/raw/release/mihomo/domain/Tracking.mrs",
  advertising: "https://github.com/666OS/rules/raw/release/mihomo/domain/Advertising.mrs",
  direct: "https://github.com/666OS/rules/raw/release/mihomo/domain/Direct.mrs",
  locationDKS: "https://github.com/666OS/rules/raw/release/mihomo/domain/LocationDKS.mrs",
  private: "https://github.com/666OS/rules/raw/release/mihomo/domain/Private.mrs",
  download: "https://github.com/666OS/rules/raw/release/mihomo/domain/Download.mrs",
  speedtest: "https://github.com/666OS/rules/raw/release/mihomo/domain/Speedtest.mrs",
  telegram: "https://github.com/666OS/rules/raw/release/mihomo/domain/Telegram.mrs",
  twitter: "https://github.com/666OS/rules/raw/release/mihomo/domain/Twitter.mrs",
  socialMedia: "https://github.com/666OS/rules/raw/release/mihomo/domain/SocialMedia.mrs",
  newsMedia: "https://github.com/666OS/rules/raw/release/mihomo/domain/NewsMedia.mrs",
  games: "https://github.com/666OS/rules/raw/release/mihomo/domain/Games.mrs",
  crypto: "https://github.com/666OS/rules/raw/release/mihomo/domain/Crypto.mrs",
  netflix: "https://github.com/666OS/rules/raw/release/mihomo/domain/Netflix.mrs",
  youtube: "https://github.com/666OS/rules/raw/release/mihomo/domain/YouTube.mrs",
  xptv: "https://github.com/666OS/rules/raw/release/mihomo/domain/XPTV.mrs",
  emby: "https://github.com/666OS/rules/raw/release/mihomo/domain/Emby.mrs",
  streaming: "https://github.com/666OS/rules/raw/release/mihomo/domain/Streaming.mrs",
  appleCN: "https://github.com/666OS/rules/raw/release/mihomo/domain/AppleCN.mrs",
  apple: "https://github.com/666OS/rules/raw/release/mihomo/domain/Apple.mrs",
  google: "https://github.com/666OS/rules/raw/release/mihomo/domain/Google.mrs",
  microsoft: "https://github.com/666OS/rules/raw/release/mihomo/domain/Microsoft.mrs",
  facebook: "https://github.com/666OS/rules/raw/release/mihomo/domain/Facebook.mrs",
  proxy: "https://github.com/666OS/rules/raw/release/mihomo/domain/Proxy.mrs",
  china: "https://github.com/666OS/rules/raw/release/mihomo/domain/China.mrs",
  ad: "https://cdn.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Providers/BanAD.yaml",
  app: "https://cdn.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Providers/BanProgramAD.yaml",
  gfw: "https://cdn.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Providers/ProxyGFWlist.yaml",
  // IP 规则集
  advertisingIP: "https://github.com/666OS/rules/raw/release/mihomo/ip/Advertising.mrs",
  privateIP: "https://github.com/666OS/rules/raw/release/mihomo/ip/Private.mrs",
  telegramIP: "https://github.com/666OS/rules/raw/release/mihomo/ip/Telegram.mrs",
  socialMediaIP: "https://github.com/666OS/rules/raw/release/mihomo/ip/SocialMedia.mrs",
  xptvIP: "https://github.com/666OS/rules/raw/release/mihomo/ip/XPTV.mrs",
  embyIP: "https://github.com/666OS/rules/raw/release/mihomo/ip/Emby.mrs",
  netflixIP: "https://github.com/666OS/rules/raw/release/mihomo/ip/Netflix.mrs",
  streamingIP: "https://github.com/666OS/rules/raw/release/mihomo/ip/Streaming.mrs",
  googleIP: "https://github.com/666OS/rules/raw/release/mihomo/ip/Google.mrs",
  facebookIP: "https://github.com/666OS/rules/raw/release/mihomo/ip/Facebook.mrs",
  proxyIP: "https://github.com/666OS/rules/raw/release/mihomo/ip/Proxy.mrs",
  chinaIP: "https://github.com/666OS/rules/raw/release/mihomo/ip/China.mrs"
};

// =========================================================
// 2. AI 平台专用规则（合并）
// =========================================================
const aiRules = [
  // ChatGPT
  "DOMAIN-KEYWORD,openai,🤖 AI 服务",
  "DOMAIN-SUFFIX,chatgpt.com,🤖 AI 服务",
  "DOMAIN-SUFFIX,openai.com,🤖 AI 服务",
  "DOMAIN-SUFFIX,auth0.com,🤖 AI 服务",
  "DOMAIN-SUFFIX,identrust.com,🤖 AI 服务",
  
  // Gemini
  "DOMAIN-SUFFIX,gemini.google.com,🤖 AI 服务",
  "DOMAIN-SUFFIX,bard.google.com,🤖 AI 服务",
  "DOMAIN-KEYWORD,gemini,🤖 AI 服务",
  "DOMAIN-SUFFIX,generativelanguage.googleapis.com,🤖 AI 服务",
  
  // Copilot
  "DOMAIN-SUFFIX,copilot.microsoft.com,🤖 AI 服务",
  "DOMAIN-KEYWORD,copilot,🤖 AI 服务",
  "DOMAIN-SUFFIX,sydney.bing.com,🤖 AI 服务",
  "DOMAIN-SUFFIX,bingapis.com,🤖 AI 服务",
  
  // Claude & 其他 AI
  "DOMAIN-KEYWORD,anthropic,🤖 AI 服务",
  "DOMAIN-KEYWORD,claude,🤖 AI 服务",
  "DOMAIN-SUFFIX,anthropic.com,🤖 AI 服务"
];

// =========================================================
// 3. 核心逻辑处理
// =========================================================
function main(config) {
  const proxies = config.proxies || [];
  
  // 1. 过滤节点（增强版）
  const excludeKeywords = [
    "过期", "剩余", "套餐", "官网", "重置", "到期", "流量", 
    "测试", "发布页", "群", "国内", "邀请", 
    "USE", "USED", "TOTAL", "EXPIRE", "EMAIL"
  ];

  const baseProxyNames = proxies
    .map(p => p && p.name)
    .filter(Boolean)
    .filter(name => {
      const lowerName = name.toLowerCase();
      return !excludeKeywords.some(keyword => lowerName.includes(keyword.toLowerCase()));
    });

  // 从 config.proxies 中移除被过滤的节点
  const validProxyNames = new Set(baseProxyNames);
  config.proxies = proxies.filter(p => p && p.name && validProxyNames.has(p.name));

  if (baseProxyNames.length === 0) return config;

  // 2. 注入规则提供者
  config["rule-providers"] = {
    // 域名规则
    tracking_rule: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: remoteProviders.tracking,
      path: "./ruleset/tracking.mrs",
      interval: 86400
    },
    advertising_rule: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: remoteProviders.advertising,
      path: "./ruleset/advertising.mrs",
      interval: 86400
    },
    direct_rule: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: remoteProviders.direct,
      path: "./ruleset/direct.mrs",
      interval: 86400
    },
    locationdks_rule: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: remoteProviders.locationDKS,
      path: "./ruleset/locationdks.mrs",
      interval: 86400
    },
    private_rule: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: remoteProviders.private,
      path: "./ruleset/private.mrs",
      interval: 86400
    },
    download_rule: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: remoteProviders.download,
      path: "./ruleset/download.mrs",
      interval: 86400
    },
    speedtest_rule: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: remoteProviders.speedtest,
      path: "./ruleset/speedtest.mrs",
      interval: 86400
    },
    telegram_rule: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: remoteProviders.telegram,
      path: "./ruleset/telegram.mrs",
      interval: 86400
    },
    twitter_rule: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: remoteProviders.twitter,
      path: "./ruleset/twitter.mrs",
      interval: 86400
    },
    socialmedia_rule: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: remoteProviders.socialMedia,
      path: "./ruleset/socialmedia.mrs",
      interval: 86400
    },
    newsmedia_rule: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: remoteProviders.newsMedia,
      path: "./ruleset/newsmedia.mrs",
      interval: 86400
    },
    games_rule: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: remoteProviders.games,
      path: "./ruleset/games.mrs",
      interval: 86400
    },
    crypto_rule: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: remoteProviders.crypto,
      path: "./ruleset/crypto.mrs",
      interval: 86400
    },
    netflix_rule: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: remoteProviders.netflix,
      path: "./ruleset/netflix.mrs",
      interval: 86400
    },
    youtube_rule: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: remoteProviders.youtube,
      path: "./ruleset/youtube.mrs",
      interval: 86400
    },
    xptv_rule: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: remoteProviders.xptv,
      path: "./ruleset/xptv.mrs",
      interval: 86400
    },
    emby_rule: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: remoteProviders.emby,
      path: "./ruleset/emby.mrs",
      interval: 86400
    },
    streaming_rule: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: remoteProviders.streaming,
      path: "./ruleset/streaming.mrs",
      interval: 86400
    },
    applecn_rule: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: remoteProviders.appleCN,
      path: "./ruleset/applecn.mrs",
      interval: 86400
    },
    apple_rule: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: remoteProviders.apple,
      path: "./ruleset/apple.mrs",
      interval: 86400
    },
    google_rule: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: remoteProviders.google,
      path: "./ruleset/google.mrs",
      interval: 86400
    },
    microsoft_rule: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: remoteProviders.microsoft,
      path: "./ruleset/microsoft.mrs",
      interval: 86400
    },
    facebook_rule: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: remoteProviders.facebook,
      path: "./ruleset/facebook.mrs",
      interval: 86400
    },
    proxy_rule: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: remoteProviders.proxy,
      path: "./ruleset/proxy.mrs",
      interval: 86400
    },
    china_rule: {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: remoteProviders.china,
      path: "./ruleset/china.mrs",
      interval: 86400
    },
    ad_rule: {
      type: "http",
      behavior: "domain",
      format: "yaml",
      url: remoteProviders.ad,
      path: "./ruleset/ad.yaml",
      interval: 86400
    },
    app_rule: {
      type: "http",
      behavior: "domain",
      format: "yaml",
      url: remoteProviders.app,
      path: "./ruleset/app.yaml",
      interval: 86400
    },
    gfw_rule: {
      type: "http",
      behavior: "domain",
      format: "yaml",
      url: remoteProviders.gfw,
      path: "./ruleset/gfw.yaml",
      interval: 86400
    },
    
    // IP 规则
    advertising_ip: {
      type: "http",
      behavior: "ipcidr",
      format: "mrs",
      url: remoteProviders.advertisingIP,
      path: "./ruleset/advertising_ip.mrs",
      interval: 86400
    },
    private_ip: {
      type: "http",
      behavior: "ipcidr",
      format: "mrs",
      url: remoteProviders.privateIP,
      path: "./ruleset/private_ip.mrs",
      interval: 86400
    },
    telegram_ip: {
      type: "http",
      behavior: "ipcidr",
      format: "mrs",
      url: remoteProviders.telegramIP,
      path: "./ruleset/telegram_ip.mrs",
      interval: 86400
    },
    socialmedia_ip: {
      type: "http",
      behavior: "ipcidr",
      format: "mrs",
      url: remoteProviders.socialMediaIP,
      path: "./ruleset/socialmedia_ip.mrs",
      interval: 86400
    },
    xptv_ip: {
      type: "http",
      behavior: "ipcidr",
      format: "mrs",
      url: remoteProviders.xptvIP,
      path: "./ruleset/xptv_ip.mrs",
      interval: 86400
    },
    emby_ip: {
      type: "http",
      behavior: "ipcidr",
      format: "mrs",
      url: remoteProviders.embyIP,
      path: "./ruleset/emby_ip.mrs",
      interval: 86400
    },
    netflix_ip: {
      type: "http",
      behavior: "ipcidr",
      format: "mrs",
      url: remoteProviders.netflixIP,
      path: "./ruleset/netflix_ip.mrs",
      interval: 86400
    },
    streaming_ip: {
      type: "http",
      behavior: "ipcidr",
      format: "mrs",
      url: remoteProviders.streamingIP,
      path: "./ruleset/streaming_ip.mrs",
      interval: 86400
    },
    google_ip: {
      type: "http",
      behavior: "ipcidr",
      format: "mrs",
      url: remoteProviders.googleIP,
      path: "./ruleset/google_ip.mrs",
      interval: 86400
    },
    facebook_ip: {
      type: "http",
      behavior: "ipcidr",
      format: "mrs",
      url: remoteProviders.facebookIP,
      path: "./ruleset/facebook_ip.mrs",
      interval: 86400
    },
    proxy_ip: {
      type: "http",
      behavior: "ipcidr",
      format: "mrs",
      url: remoteProviders.proxyIP,
      path: "./ruleset/proxy_ip.mrs",
      interval: 86400
    },
    china_ip: {
      type: "http",
      behavior: "ipcidr",
      format: "mrs",
      url: remoteProviders.chinaIP,
      path: "./ruleset/china_ip.mrs",
      interval: 86400
    }
  };

  // 3. 辅助函数：根据正则筛选节点
  const getProxiesByRegex = (regex) => {
    const matched = baseProxyNames.filter(n => regex.test(n));
    return matched.length > 0 ? matched : ["DIRECT"];
  };

  // 检查地区是否有实际节点
  const hasProxiesForRegion = (regex) => {
    return baseProxyNames.some(n => regex.test(n));
  };

  // 4. 定义策略组（新增负载均衡，interval=200）
  const uniq = (arr) => [...new Set(arr)];
  const baseAllProxyChoices = uniq(["♻️ 自动选择", ...baseProxyNames, "DIRECT"]);

  // 构建可用地区列表（动态，仅包含有节点的地区）
  const regionDefinitions = [
    { name: "🇭🇰 香港节点", regex: /HK|Hong|Kong|香港|港/, icon: "Hong_Kong" },
    { name: "🇯🇵 日本节点", regex: /JP|Japan|日本|日|Osaka|Tokyo/, icon: "Japan" },
    { name: "🇺🇲 美国节点", regex: /US|America|States|美国|美/, icon: "United_States" },
    { name: "🇨🇳 台湾节点", regex: /TW|Taiwan|台湾|台|Taipei/, icon: "Taiwan" },
    { name: "🇸🇬 狮城节点", regex: /SG|Singapore|狮城|新加坡/, icon: "Singapore" }
  ];

  const availableRegions = regionDefinitions.filter(r => hasProxiesForRegion(r.regex));
  const availableRegionNames = availableRegions.map(r => r.name);

  const groups = [
    {
      name: "🚀 节点选择",
      type: "select",
      icon: "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Proxy.png",
      proxies: [
        "♻️ 自动选择",
        "⚖️ 负载均衡-散列",
        "⚖️ 负载均衡-轮询",
        ...availableRegionNames,
        "🚀 手动切换", 
        "DIRECT"
      ]
    },
    {
      name: "🚀 手动切换",
      type: "select",
      icon: "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Clubhouse.png",
      proxies: [...baseProxyNames]
    },
    {
      name: "♻️ 自动选择",
      type: "url-test",
      icon: "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Auto.png",
      url: "http://www.gstatic.com/generate_204",
      interval: 200,
      tolerance: 50,
      lazy: true,
      proxies: baseProxyNames
    },
    {
      name: "⚖️ 负载均衡-散列",
      type: "load-balance",
      strategy: "consistent-hashing",
      icon: "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Round_Robin_1.png",
      url: "http://www.gstatic.com/generate_204",
      interval: 200,
      lazy: true,
      hidden: true,
      proxies: baseProxyNames
    },
    {
      name: "⚖️ 负载均衡-轮询",
      type: "load-balance",
      strategy: "round-robin",
      icon: "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Round_Robin.png",
      url: "http://www.gstatic.com/generate_204",
      interval: 200,
      lazy: true,
      hidden: true,
      proxies: baseProxyNames
    },
    // --- AI 策略组 ---
    {
      name: "🤖 AI 服务",
      type: "select",
      icon: "https://github.com/Koolson/Qure/raw/master/IconSet/Color/ChatGPT.png",
      proxies: ["🚀 节点选择", "♻️ 自动选择", "⚖️ 负载均衡-散列", "⚖️ 负载均衡-轮询", ...availableRegionNames, "🚀 手动切换", "DIRECT"]
    },
    // --- 应用分组 ---
    {
      name: "📲 电报消息",
      type: "select",
      icon: "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Telegram_X.png",
      proxies: ["🚀 节点选择", "♻️ 自动选择", "⚖️ 负载均衡-散列", "⚖️ 负载均衡-轮询", ...availableRegionNames, "🚀 手动切换", "DIRECT"]
    },
    {
      name: "🐦 推特社交",
      type: "select",
      icon: "https://github.com/Koolson/Qure/raw/master/IconSet/Color/X.png",
      proxies: ["🚀 节点选择", "♻️ 自动选择", "⚖️ 负载均衡-散列", "⚖️ 负载均衡-轮询", ...availableRegionNames, "🚀 手动切换", "DIRECT"]
    },
    {
      name: "📘 社交平台",
      type: "select",
      icon: "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Facebook.png",
      proxies: ["🚀 节点选择", "♻️ 自动选择", "⚖️ 负载均衡-散列", "⚖️ 负载均衡-轮询", ...availableRegionNames, "🚀 手动切换", "DIRECT"]
    },
    {
      name: "🎬 流媒体服务",
      type: "select",
      icon: "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Streaming.png",
      proxies: ["🚀 节点选择", "♻️ 自动选择", "⚖️ 负载均衡-散列", "⚖️ 负载均衡-轮询", ...availableRegionNames, "🚀 手动切换", "DIRECT"]
    },
    {
      name: "📰 新闻媒体",
      type: "select",
      icon: "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Apple_News.png",
      proxies: ["🚀 节点选择", "♻️ 自动选择", "⚖️ 负载均衡-散列", "⚖️ 负载均衡-轮询", ...availableRegionNames, "🚀 手动切换", "DIRECT"]
    },
    {
      name: "🎮 游戏平台",
      type: "select",
      icon: "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Game.png",
      proxies: ["DIRECT", "🚀 节点选择", "♻️ 自动选择", ...availableRegionNames, "🚀 手动切换"]
    },
    {
      name: "Ⓜ️ 微软服务",
      type: "select",
      icon: "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Microsoft.png",
      proxies: ["DIRECT", "🚀 节点选择", ...availableRegionNames, "🚀 手动切换"]
    },
    {
      name: "🍎 苹果服务",
      type: "select",
      icon: "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Apple.png",
      proxies: ["DIRECT", "🚀 节点选择", ...availableRegionNames, "🚀 手动切换"]
    },
    {
      name: "🔍 谷歌服务",
      type: "select",
      icon: "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Google_Search.png",
      proxies: ["🚀 节点选择", "♻️ 自动选择", ...availableRegionNames, "🚀 手动切换", "DIRECT"]
    },
    {
      name: "📥 下载服务",
      type: "select",
      icon: "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Download.png",
      proxies: ["DIRECT", "🚀 节点选择", "♻️ 自动选择"]
    },
    {
      name: "🎯 全球直连",
      type: "select",
      icon: "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Direct.png",
      proxies: ["DIRECT", "🚀 节点选择", "♻️ 自动选择"]
    },
    {
      name: "🛑 广告拦截",
      type: "select",
      icon: "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Advertising.png",
      proxies: ["REJECT", "DIRECT"]
    },
    {
      name: "🍃 应用净化",
      type: "select",
      icon: "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Reject.png",
      proxies: ["REJECT", "DIRECT"]
    },
    {
      name: "🐟 漏网之鱼",
      type: "select",
      icon: "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Final.png",
      proxies: ["🚀 节点选择", "♻️ 自动选择", "⚖️ 负载均衡-散列", "⚖️ 负载均衡-轮询", "DIRECT", ...availableRegionNames, "🚀 手动切换"]
    },
    // --- 地区分组（新增负载均衡子组）---
    // 地区定义
    ...(hasProxiesForRegion(/HK|Hong|Kong|香港|港/) ? [
      {
        name: "🇭🇰 香港节点",
        type: "select",
        icon: "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Hong_Kong.png",
        proxies: ["🇭🇰 香港自动", "🇭🇰 香港均衡-散列", "🇭🇰 香港均衡-轮询", ...getProxiesByRegex(/HK|Hong|Kong|香港|港/)]
      },
      {
        name: "🇭🇰 香港自动",
        type: "url-test",
        url: "http://www.gstatic.com/generate_204",
        interval: 200,
        tolerance: 50,
        lazy: true,
        hidden: true,
        proxies: getProxiesByRegex(/HK|Hong|Kong|香港|港/)
      },
      {
        name: "🇭🇰 香港均衡-散列",
        type: "load-balance",
        strategy: "consistent-hashing",
        url: "http://www.gstatic.com/generate_204",
        interval: 200,
        lazy: true,
        hidden: true,
        proxies: getProxiesByRegex(/HK|Hong|Kong|香港|港/)
      },
      {
        name: "🇭🇰 香港均衡-轮询",
        type: "load-balance",
        strategy: "round-robin",
        url: "http://www.gstatic.com/generate_204",
        interval: 200,
        lazy: true,
        hidden: true,
        proxies: getProxiesByRegex(/HK|Hong|Kong|香港|港/)
      }
    ] : []),

    // 日本
    ...(hasProxiesForRegion(/JP|Japan|日本|日|Osaka|Tokyo/) ? [
      {
        name: "🇯🇵 日本节点",
        type: "select",
        icon: "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Japan.png",
        proxies: ["🇯🇵 日本自动", "🇯🇵 日本均衡-散列", "🇯🇵 日本均衡-轮询", ...getProxiesByRegex(/JP|Japan|日本|日|Osaka|Tokyo/)]
      },
      {
        name: "🇯🇵 日本自动",
        type: "url-test",
        url: "http://www.gstatic.com/generate_204",
        interval: 200,
        tolerance: 50,
        lazy: true,
        hidden: true,
        proxies: getProxiesByRegex(/JP|Japan|日本|日|Osaka|Tokyo/)
      },
      {
        name: "🇯🇵 日本均衡-散列",
        type: "load-balance",
        strategy: "consistent-hashing",
        url: "http://www.gstatic.com/generate_204",
        interval: 200,
        lazy: true,
        hidden: true,
        proxies: getProxiesByRegex(/JP|Japan|日本|日|Osaka|Tokyo/)
      },
      {
        name: "🇯🇵 日本均衡-轮询",
        type: "load-balance",
        strategy: "round-robin",
        url: "http://www.gstatic.com/generate_204",
        interval: 200,
        lazy: true,
        hidden: true,
        proxies: getProxiesByRegex(/JP|Japan|日本|日|Osaka|Tokyo/)
      }
    ] : []),

    // 美国
    ...(hasProxiesForRegion(/US|America|States|美国|美/) ? [
      {
        name: "🇺🇲 美国节点",
        type: "select",
        icon: "https://github.com/Koolson/Qure/raw/master/IconSet/Color/United_States.png",
        proxies: ["🇺🇲 美国自动", "🇺🇲 美国均衡-散列", "🇺🇲 美国均衡-轮询", ...getProxiesByRegex(/US|America|States|美国|美/)]
      },
      {
        name: "🇺🇲 美国自动",
        type: "url-test",
        url: "http://www.gstatic.com/generate_204",
        interval: 200,
        tolerance: 150,
        lazy: true,
        hidden: true,
        proxies: getProxiesByRegex(/US|America|States|美国|美/)
      },
      {
        name: "🇺🇲 美国均衡-散列",
        type: "load-balance",
        strategy: "consistent-hashing",
        url: "http://www.gstatic.com/generate_204",
        interval: 200,
        lazy: true,
        hidden: true,
        proxies: getProxiesByRegex(/US|America|States|美国|美/)
      },
      {
        name: "🇺🇲 美国均衡-轮询",
        type: "load-balance",
        strategy: "round-robin",
        url: "http://www.gstatic.com/generate_204",
        interval: 200,
        lazy: true,
        hidden: true,
        proxies: getProxiesByRegex(/US|America|States|美国|美/)
      }
    ] : []),

    // 台湾
    ...(hasProxiesForRegion(/TW|Taiwan|台湾|台|Taipei/) ? [
      {
        name: "🇨🇳 台湾节点",
        type: "select",
        icon: "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Taiwan.png",
        proxies: ["🇨🇳 台湾自动", "🇨🇳 台湾均衡-散列", "🇨🇳 台湾均衡-轮询", ...getProxiesByRegex(/TW|Taiwan|台湾|台|Taipei/)]
      },
      {
        name: "🇨🇳 台湾自动",
        type: "url-test",
        url: "http://www.gstatic.com/generate_204",
        interval: 200,
        tolerance: 50,
        lazy: true,
        hidden: true,
        proxies: getProxiesByRegex(/TW|Taiwan|台湾|台|Taipei/)
      },
      {
        name: "🇨🇳 台湾均衡-散列",
        type: "load-balance",
        strategy: "consistent-hashing",
        url: "http://www.gstatic.com/generate_204",
        interval: 200,
        lazy: true,
        hidden: true,
        proxies: getProxiesByRegex(/TW|Taiwan|台湾|台|Taipei/)
      },
      {
        name: "🇨🇳 台湾均衡-轮询",
        type: "load-balance",
        strategy: "round-robin",
        url: "http://www.gstatic.com/generate_204",
        interval: 200,
        lazy: true,
        hidden: true,
        proxies: getProxiesByRegex(/TW|Taiwan|台湾|台|Taipei/)
      }
    ] : []),

    // 新加坡
    ...(hasProxiesForRegion(/SG|Singapore|狮城|新加坡/) ? [
      {
        name: "🇸🇬 狮城节点",
        type: "select",
        icon: "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Singapore.png",
        proxies: ["🇸🇬 狮城自动", "🇸🇬 狮城均衡-散列", "🇸🇬 狮城均衡-轮询", ...getProxiesByRegex(/SG|Singapore|狮城|新加坡/)]
      },
      {
        name: "🇸🇬 狮城自动",
        type: "url-test",
        url: "http://www.gstatic.com/generate_204",
        interval: 200,
        tolerance: 50,
        lazy: true,
        hidden: true,
        proxies: getProxiesByRegex(/SG|Singapore|狮城|新加坡/)
      },
      {
        name: "🇸🇬 狮城均衡-散列",
        type: "load-balance",
        strategy: "consistent-hashing",
        url: "http://www.gstatic.com/generate_204",
        interval: 200,
        lazy: true,
        hidden: true,
        proxies: getProxiesByRegex(/SG|Singapore|狮城|新加坡/)
      },
      {
        name: "🇸🇬 狮城均衡-轮询",
        type: "load-balance",
        strategy: "round-robin",
        url: "http://www.gstatic.com/generate_204",
        interval: 200,
        lazy: true,
        hidden: true,
        proxies: getProxiesByRegex(/SG|Singapore|狮城|新加坡/)
      }
    ] : []),

  ];

  config["proxy-groups"] = groups;

  // =========================================================
  // 5. 规则组合（优先级排序）
  // =========================================================
  const finalRules = [
    // "PROCESS-NAME,ClashMacDashboard,🚀 节点选择",
    "DOMAIN-SUFFIX,ip.sb,🚀 节点选择",
    // 1. 追踪与广告拦截（最高优先级）
    
    "RULE-SET,tracking_rule,🛑 广告拦截",
    "RULE-SET,advertising_rule,🛑 广告拦截",
    "RULE-SET,advertising_ip,🛑 广告拦截,no-resolve",
    "RULE-SET,ad_rule,🛑 广告拦截",
    "RULE-SET,app_rule,🍃 应用净化",

    // 2. 隐私与直连（第二优先级）
    "RULE-SET,private_rule,🎯 全球直连",
    "RULE-SET,private_ip,🎯 全球直连,no-resolve",
    "RULE-SET,locationdks_rule,🎯 全球直连",
    "RULE-SET,direct_rule,🎯 全球直连",
    "RULE-SET,download_rule,📥 下载服务",
    "RULE-SET,applecn_rule,🎯 全球直连",
    "RULE-SET,xptv_rule,🎯 全球直连",
    "RULE-SET,xptv_ip,🎯 全球直连,no-resolve",

    // 1.5 本地地址直连
    "DOMAIN-SUFFIX,acl4.ssr,DIRECT",
    "DOMAIN-SUFFIX,ip6-localhost,DIRECT",
    "DOMAIN-SUFFIX,ip6-loopback,DIRECT",
    "DOMAIN-SUFFIX,internal,DIRECT",
    "DOMAIN-SUFFIX,lan,DIRECT",
    "DOMAIN-SUFFIX,local,DIRECT",
    "DOMAIN-SUFFIX,localhost,DIRECT",
    "IP-CIDR,0.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,100.64.0.0/10,DIRECT,no-resolve",
    "IP-CIDR,127.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,169.254.0.0/16,DIRECT,no-resolve",
    "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
    "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
    "IP-CIDR,198.18.0.0/16,DIRECT,no-resolve",
    "IP-CIDR,224.0.0.0/4,DIRECT,no-resolve",
    "IP-CIDR6,::1/128,DIRECT,no-resolve",
    "IP-CIDR6,fc00::/7,DIRECT,no-resolve",
    "IP-CIDR6,fe80::/10,DIRECT,no-resolve",
    "IP-CIDR6,fd00::/8,DIRECT,no-resolve",
    "DOMAIN-KEYWORD,onedrive,🎯 全球直连",
    // 2. OneDrive 直连
    // "DOMAIN-KEYWORD,api.ip,🚀 节点选择",
    // "DOMAIN-KEYWORD,ip.sb,🚀 节点选择",

    "DOMAIN-KEYWORD,sharepoint,🎯 全球直连",
    "DOMAIN-SUFFIX,live.com,🎯 全球直连",
    "DOMAIN-SUFFIX,microsoftonline.com,🎯 全球直连",

    // 3. AI 平台规则（本地优先）
    ...aiRules,



    // 4. 应用与服务分流
    // 进程匹配规则


    "RULE-SET,telegram_rule,📲 电报消息",
    "RULE-SET,telegram_ip,📲 电报消息,no-resolve",
    "RULE-SET,twitter_rule,🐦 推特社交",
    "RULE-SET,socialmedia_rule,📘 社交平台",
    "RULE-SET,socialmedia_ip,📘 社交平台,no-resolve",
    "RULE-SET,facebook_rule,📘 社交平台",
    "RULE-SET,facebook_ip,📘 社交平台,no-resolve",
    "RULE-SET,newsmedia_rule,📰 新闻媒体",
    "RULE-SET,games_rule,🎮 游戏平台",

    // 5. 流媒体分流（合并到统一策略组）
    "RULE-SET,emby_rule,🎬 流媒体服务",
    "RULE-SET,emby_ip,🎬 流媒体服务,no-resolve",
    "RULE-SET,netflix_rule,🎬 流媒体服务",
    "RULE-SET,netflix_ip,🎬 流媒体服务,no-resolve",
    "RULE-SET,youtube_rule,🎬 流媒体服务",
    "RULE-SET,streaming_rule,🎬 流媒体服务",
    "RULE-SET,streaming_ip,🎬 流媒体服务,no-resolve",

    // 6. 大厂服务
    "RULE-SET,apple_rule,🍎 苹果服务",
    "RULE-SET,google_rule,🔍 谷歌服务",
    "RULE-SET,google_ip,🔍 谷歌服务,no-resolve",
    "RULE-SET,microsoft_rule,Ⓜ️ 微软服务",

    // 7. 代理与中国分流
    "RULE-SET,gfw_rule,🚀 节点选择",
    "RULE-SET,proxy_rule,🚀 节点选择",
    "RULE-SET,proxy_ip,🚀 节点选择,no-resolve",
    "RULE-SET,china_rule,🎯 全球直连",
    "RULE-SET,china_ip,🎯 全球直连,no-resolve",
  
    // 8. 兜底规则
    "MATCH,🐟 漏网之鱼"
  ];

  config.rules = finalRules;

  // DNS 配置
  if (!config.dns) config.dns = {};
  if (config.dns.enable !== true) config.dns.enable = true;
  if (!Array.isArray(config.dns.nameserver) || config.dns.nameserver.length === 0) {
    config.dns.nameserver = ["119.29.29.29", "223.5.5.5"];
  }
  if (!Array.isArray(config.dns.fallback) || config.dns.fallback.length === 0) {
    config.dns.fallback = [
      "8.8.8.8",
      "8.8.4.4",
      "1.1.1.1",
      "tls://1.0.0.1:853",
      "tls://dns.google:853"
    ];
  }
  config['mixed-port'] = 56789;
  config['global-client-fingerprint'] = 'chrome';

  // 流量嗅探配置
  config['sniffer'] = {
    enable: true,
    sniff: {
      HTTP: {
        ports: [80, "8080-8880"],
        "override-destination": true
      },
      TLS: {
        ports: [443, 8443]
      },
      QUIC: {
        ports: [443, 8443]
      }
    },
    "skip-domain": [
      "Mijia Cloud",
      "+.push.apple.com"
    ]
  };
  
  return config;
}