// Clash Pro 专业配置脚本
// 功能：结合在线规则集和本地静态规则，包含广告拦截、GFW 分流、中国域名/IP 直连、AI 平台细分等专业配置
// 特点：混合规则集模式，平衡灵活性和性能

// =========================================================
// 1. 在线规则集 (仅保留广告/隐私)
// =========================================================
const remoteProviders = {
  "ad": "https://cdn.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Providers/BanAD.yaml",
  "app": "https://cdn.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Providers/BanProgramAD.yaml",
  "gfwlist": "https://cdn.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Providers/ProxyGFWlist.yaml",
  "chinaDomain": "https://cdn.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Providers/ChinaDomain.yaml",
  "chinaIp": "https://cdn.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Providers/ChinaIp.yaml"
};

// =========================================================
// 2. 本地静态规则 (您提供的大全 + AI细分重定向逻辑)
// =========================================================
const rawRules = [
  // --- 基础规则 ---
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
  
  // --- 直连域名与应用 ---
  "DOMAIN,instant.arubanetworks.com,🎯 全球直连",
  "DOMAIN,setmeup.arubanetworks.com,🎯 全球直连",
  "DOMAIN,router.asus.com,🎯 全球直连",
  "DOMAIN,www.asusrouter.com,🎯 全球直连",
  "DOMAIN-SUFFIX,hiwifi.com,🎯 全球直连",
  "DOMAIN-SUFFIX,leike.cc,🎯 全球直连",
  "DOMAIN-SUFFIX,miwifi.com,🎯 全球直连",
  "DOMAIN-SUFFIX,my.router,🎯 全球直连",
  "DOMAIN-SUFFIX,p.to,🎯 全球直连",
  "DOMAIN-SUFFIX,peiluyou.com,🎯 全球直连",
  "DOMAIN-SUFFIX,phicomm.me,🎯 全球直连",
  "DOMAIN-SUFFIX,router.ctc,🎯 全球直连",
  "DOMAIN-SUFFIX,routerlogin.com,🎯 全球直连",
  "DOMAIN-SUFFIX,tendawifi.com,🎯 全球直连",
  "DOMAIN-SUFFIX,zte.home,🎯 全球直连",
  "DOMAIN-SUFFIX,tplogin.cn,🎯 全球直连",
  "DOMAIN-SUFFIX,wifi.cmcc,🎯 全球直连",
  "DOMAIN-SUFFIX,ol.epicgames.com,🎯 全球直连",
  "DOMAIN-SUFFIX,dizhensubao.getui.com,🎯 全球直连",
  "DOMAIN,dl.google.com,🎯 全球直连",
  "DOMAIN-SUFFIX,googletraveladservices.com,🎯 全球直连",
  "DOMAIN-SUFFIX,tracking-protection.cdn.mozilla.net,🎯 全球直连",
  "DOMAIN,origin-a.akamaihd.net,🎯 全球直连",
  "DOMAIN,fairplay.l.qq.com,🎯 全球直连",
  "DOMAIN,livew.l.qq.com,🎯 全球直连",
  "DOMAIN,vd.l.qq.com,🎯 全球直连",
  "DOMAIN,errlog.umeng.com,🎯 全球直连",
  "DOMAIN,msg.umeng.com,🎯 全球直连",
  "DOMAIN,msg.umengcloud.com,🎯 全球直连",
  "DOMAIN,tracking.miui.com,🎯 全球直连",
  "DOMAIN,app.adjust.com,🎯 全球直连",
  "DOMAIN,bdtj.tagtic.cn,🎯 全球直连",
  "DOMAIN,rewards.hypixel.net,🎯 全球直连",
  "DOMAIN-SUFFIX,koodomobile.com,🎯 全球直连",
  "DOMAIN-SUFFIX,koodomobile.ca,🎯 全球直连",
  "DOMAIN-SUFFIX,synology.me,🎯 全球直连",
  "DOMAIN-SUFFIX,DiskStation.me,🎯 全球直连",
  "DOMAIN-SUFFIX,i234.me,🎯 全球直连",
  "DOMAIN-SUFFIX,myDS.me,🎯 全球直连",
  "DOMAIN-SUFFIX,DSCloud.biz,🎯 全球直连",
  "DOMAIN-SUFFIX,DSCloud.me,🎯 全球直连",
  "DOMAIN-SUFFIX,DSCloud.mobi,🎯 全球直连",
  "DOMAIN-SUFFIX,DSmyNAS.com,🎯 全球直连",
  "DOMAIN-SUFFIX,DSmyNAS.net,🎯 全球直连",
  "DOMAIN-SUFFIX,DSmyNAS.org,🎯 全球直连",
  "DOMAIN-SUFFIX,FamilyDS.com,🎯 全球直连",
  "DOMAIN-SUFFIX,FamilyDS.net,🎯 全球直连",
  "DOMAIN-SUFFIX,FamilyDS.org,🎯 全球直连",
  
  // --- 微软规则 (Bing特殊处理) ---
  "DOMAIN-SUFFIX,bing.com,Ⓜ️ 微软Bing",
  "DOMAIN-SUFFIX,copilot.cloud.microsoft,Ⓜ️ 微软Bing",
  "DOMAIN-SUFFIX,copilot.microsoft.com,Ⓜ️ 微软Bing",
  "PROCESS-NAME,OneDrive,Ⓜ️ 微软云盘",
  "DOMAIN-KEYWORD,1drv,Ⓜ️ 微软云盘",
  "DOMAIN-KEYWORD,onedrive,Ⓜ️ 微软云盘",
  "DOMAIN-KEYWORD,skydrive,Ⓜ️ 微软云盘",
  "DOMAIN-SUFFIX,livefilestore.com,Ⓜ️ 微软云盘",
  "DOMAIN-SUFFIX,oneclient.sfx.ms,Ⓜ️ 微软云盘",
  "DOMAIN-SUFFIX,onedrive.com,Ⓜ️ 微软云盘",
  "DOMAIN-SUFFIX,onedrive.live.com,Ⓜ️ 微软云盘",
  "DOMAIN-SUFFIX,photos.live.com,Ⓜ️ 微软云盘",
  "DOMAIN-SUFFIX,sharepoint.com,Ⓜ️ 微软云盘",
  "DOMAIN-SUFFIX,sharepointonline.com,Ⓜ️ 微软云盘",
  "DOMAIN-SUFFIX,skydrive.wns.windows.com,Ⓜ️ 微软云盘",
  "DOMAIN-SUFFIX,spoprod-a.akamaihd.net,Ⓜ️ 微软云盘",
  "DOMAIN-SUFFIX,storage.live.com,Ⓜ️ 微软云盘",
  "DOMAIN-SUFFIX,storage.msn.com,Ⓜ️ 微软云盘",
  "DOMAIN-SUFFIX,microsoftpersonalcontent.com,Ⓜ️ 微软云盘",
  "DOMAIN-KEYWORD,microsoft,Ⓜ️ 微软服务",
  "DOMAIN-SUFFIX,aadrm.com,Ⓜ️ 微软服务",
  "DOMAIN-SUFFIX,acompli.com,Ⓜ️ 微软服务",
  "DOMAIN-SUFFIX,aka.ms,Ⓜ️ 微软服务",
  "DOMAIN-SUFFIX,azure.com,Ⓜ️ 微软服务",
  "DOMAIN-SUFFIX,hotmail.com,Ⓜ️ 微软服务",
  "DOMAIN-SUFFIX,live.com,Ⓜ️ 微软服务",
  "DOMAIN-SUFFIX,msn.com,Ⓜ️ 微软服务",
  "DOMAIN-SUFFIX,office.com,Ⓜ️ 微软服务",
  "DOMAIN-SUFFIX,office365.com,Ⓜ️ 微软服务",
  "DOMAIN-SUFFIX,outlook.com,Ⓜ️ 微软服务",
  "DOMAIN-SUFFIX,skype.com,Ⓜ️ 微软服务",
  "DOMAIN-SUFFIX,windows.com,Ⓜ️ 微软服务",
  "DOMAIN-SUFFIX,visualstudio.com,Ⓜ️ 微软服务",

  // --- 苹果规则 ---
  "DOMAIN-SUFFIX,apple.com,🍎 苹果服务",
  "DOMAIN-SUFFIX,icloud.com,🍎 苹果服务",
  "DOMAIN-SUFFIX,itunes.com,🍎 苹果服务",
  "DOMAIN-SUFFIX,mzstatic.com,🍎 苹果服务",
  "DOMAIN-SUFFIX,aaplimg.com,🍎 苹果服务",
  "DOMAIN-SUFFIX,cdn-apple.com,🍎 苹果服务",
  "IP-CIDR,17.0.0.0/8,🍎 苹果服务,no-resolve",

  // --- 社交应用 ---
  "DOMAIN-SUFFIX,t.me,📲 电报消息",
  "DOMAIN-SUFFIX,tdesktop.com,📲 电报消息",
  "DOMAIN-SUFFIX,telegra.ph,📲 电报消息",
  "DOMAIN-SUFFIX,telegram.me,📲 电报消息",
  "DOMAIN-SUFFIX,telegram.org,📲 电报消息",
  "IP-CIDR,91.108.0.0/16,📲 电报消息,no-resolve",
  "IP-CIDR,149.154.160.0/20,📲 电报消息,no-resolve",

  // --- AI 平台 (细分策略组) ---
  "DOMAIN-KEYWORD,openai,🤖 ChatGPT",
  "DOMAIN-SUFFIX,chatgpt.com,🤖 ChatGPT",
  "DOMAIN-SUFFIX,openai.com,🤖 ChatGPT",
  "DOMAIN-KEYWORD,anthropic,💬 其他AI",
  "DOMAIN-KEYWORD,claude,💬 其他AI",
  "DOMAIN-SUFFIX,gemini.google.com,🧠 Gemini",
  "DOMAIN-SUFFIX,bard.google.com,🧠 Gemini",
  "DOMAIN-SUFFIX,copilot.microsoft.com,✈️ Copilot",

  // --- 流媒体 ---
  "DOMAIN-KEYWORD,youtube,📹 油管视频",
  "DOMAIN-SUFFIX,googlevideo.com,📹 油管视频",
  "DOMAIN-SUFFIX,youtu.be,📹 油管视频",
  "DOMAIN-SUFFIX,youtube.com,📹 油管视频",
  "DOMAIN-KEYWORD,netflix,🎥 奈飞视频",
  "DOMAIN-SUFFIX,netflix.com,🎥 奈飞视频",
  "DOMAIN-SUFFIX,nflxvideo.net,🎥 奈飞视频",
  "DOMAIN-SUFFIX,fast.com,🎥 奈飞视频",
  "DOMAIN-SUFFIX,bahamut.com.tw,📺 巴哈姆特",
  "DOMAIN-SUFFIX,gamer.com.tw,📺 巴哈姆特",
  "DOMAIN-SUFFIX,bilibili.com,📺 哔哩哔哩",
  "DOMAIN-SUFFIX,bilivideo.com,📺 哔哩哔哩",
  "DOMAIN-SUFFIX,163yun.com,🎶 网易音乐",
  "DOMAIN-SUFFIX,music.163.com,🎶 网易音乐",
  "IP-CIDR,59.111.19.33/32,🎶 网易音乐,no-resolve",
  
  // --- 游戏 ---
  "DOMAIN-SUFFIX,epicgames.com,🎮 游戏平台",
  "DOMAIN-SUFFIX,steamcommunity.com,🎮 游戏平台",
  "DOMAIN-SUFFIX,steampowered.com,🎮 游戏平台",
  "DOMAIN-SUFFIX,playstation.com,🎮 游戏平台",
  "DOMAIN-SUFFIX,nintendo.com,🎮 游戏平台",

  // --- 国外媒体/通用 ---
  "DOMAIN-SUFFIX,google.com,🌍 国外媒体",
  "DOMAIN-SUFFIX,gmail.com,🌍 国外媒体",
  "DOMAIN-SUFFIX,facebook.com,🌍 国外媒体",
  "DOMAIN-SUFFIX,instagram.com,🌍 国外媒体",
  "DOMAIN-SUFFIX,twitter.com,🌍 国外媒体",
  "DOMAIN-SUFFIX,github.com,🚀 节点选择",
  
  // --- 兜底 ---
  "DOMAIN-KEYWORD,cn,🎯 全球直连",
  "GEOIP,CN,🎯 全球直连",
  "MATCH,🐟 漏网之鱼"
];

// =========================================================
// 3. 核心逻辑处理
// =========================================================
function main(config) {
  const proxies = config.proxies || [];

  // 保证回写到 config（当 config.proxies 原本为空/未定义时）
  config.proxies = proxies;
  
  // 1. 过滤节点 (排除过期、官网等)
  const excludeKeywords = ["过期", "剩余", "套餐", "官网", "重置", "到期", "流量", "测试", "发布页", "群","国内","邀请"];

  const baseProxyNames = proxies
    .map(p => p && p.name)
    .filter(Boolean)
    .filter(name => !excludeKeywords.some(keyword => name.includes(keyword)));

  // 如果订阅完全没有节点，则不处理
  if (baseProxyNames.length === 0) return config;

  // 2. 注入在线广告规则
  config["rule-providers"] = {
    "ad_rule": {
      type: "http",
      behavior: "classical",
      url: remoteProviders.ad,
      path: "./ruleset/ad.yaml",
      interval: 86400
    },
    "app_rule": {
      type: "http",
      behavior: "classical",
      url: remoteProviders.app,
      path: "./ruleset/app.yaml",
      interval: 86400
    },
    "gfwlist_rule": {
      type: "http",
      behavior: "classical",
      url: remoteProviders.gfwlist,
      path: "./ruleset/gfwlist.yaml",
      interval: 86400
    },
    "china_domain_rule": {
      type: "http",
      behavior: "classical",
      url: remoteProviders.chinaDomain,
      path: "./ruleset/china_domain.yaml",
      interval: 86400
    },
    "china_ip_rule": {
      type: "http",
      behavior: "classical",
      url: remoteProviders.chinaIp,
      path: "./ruleset/china_ip.yaml",
      interval: 86400
    }
  };

  // 3. 辅助函数：根据正则筛选节点
  // 如果某个国家没有节点，返回 DIRECT 防止报错
  const getProxiesByRegex = (regex) => {
    const matched = baseProxyNames.filter(n => regex.test(n));
    return matched.length > 0 ? matched : ["DIRECT"];
  };

  // 4. 定义策略组
  // 🔥 重点：🚀 节点选择 只包含"自动选择"、"各地区分组(url-test)"和"手动切换"
  // 不包含 individual proxyNames
  const uniq = (arr) => [...new Set(arr)];
  const baseAllProxyChoices = uniq(["♻️ 自动选择", ...baseProxyNames, "DIRECT"]);

  const groups = [
    {
      name: "🚀 节点选择",
      type: "select",
      proxies: [
        "♻️ 自动选择", 
        "🇭🇰 香港节点", 
        "🇨🇳 台湾节点", 
        "🇸🇬 狮城节点", 
        "🇯🇵 日本节点", 
        "🇺🇲 美国节点", 
        "🇰🇷 韩国节点", 
        "🚀 手动切换", 
        "DIRECT"
      ]
    },
    {
      name: "🚀 手动切换",
      type: "select",
      proxies: [...baseProxyNames]
    },
    {
      name: "♻️ 自动选择",
      type: "url-test",
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50,
      proxies: baseProxyNames
    },
    // --- AI 细分策略组 ---
    // 需求：在 AI 平台内细分，并且直接展示所有节点（不汇聚各国家分组）
    {
      name: "🤖 ChatGPT",
      type: "select",
      proxies: baseAllProxyChoices
    },
    {
      name: "🧠 Gemini",
      type: "select",
      proxies: baseAllProxyChoices
    },
    {
      name: "✈️ Copilot",
      type: "select",
      proxies: baseAllProxyChoices
    },
    {
      name: "💬 其他AI",
      type: "select",
      proxies: baseAllProxyChoices
    },
    // --- 应用分组 ---
    {
      name: "📲 电报消息",
      type: "select",
      proxies: ["🚀 节点选择", "♻️ 自动选择", "🇸🇬 狮城节点", "🇭🇰 香港节点", "🇨🇳 台湾节点", "🇯🇵 日本节点", "🇺🇲 美国节点", "🇰🇷 韩国节点", "🚀 手动切换", "DIRECT"]
    },
    {
      name: "📹 油管视频",
      type: "select",
      proxies: ["🚀 节点选择", "♻️ 自动选择", "🇸🇬 狮城节点", "🇭🇰 香港节点", "🇨🇳 台湾节点", "🇯🇵 日本节点", "🇺🇲 美国节点", "🇰🇷 韩国节点", "🚀 手动切换", "DIRECT"]
    },
    {
      name: "🎥 奈飞视频",
      type: "select",
      proxies: ["🎥 奈飞节点", "🚀 节点选择", "♻️ 自动选择", "🇸🇬 狮城节点", "🇭🇰 香港节点", "🇨🇳 台湾节点", "🇯🇵 日本节点", "🇺🇲 美国节点", "🇰🇷 韩国节点", "🚀 手动切换", "DIRECT"]
    },
    {
      name: "📺 巴哈姆特",
      type: "select",
      proxies: ["🇨🇳 台湾节点", "🚀 节点选择", "🚀 手动切换", "DIRECT"]
    },
    {
      name: "📺 哔哩哔哩", 
      type: "select",
      proxies: ["🎯 全球直连", "🇨🇳 台湾节点", "🇭🇰 香港节点"]
    },
    {
      name: "🌍 国外媒体",
      type: "select",
      proxies: ["🚀 节点选择", "♻️ 自动选择", "🇭🇰 香港节点", "🇨🇳 台湾节点", "🇸🇬 狮城节点", "🇯🇵 日本节点", "🇺🇲 美国节点", "🇰🇷 韩国节点", "🚀 手动切换", "DIRECT"]
    },
    {
      name: "🌏 国内媒体",
      type: "select",
      proxies: ["DIRECT", "🇭🇰 香港节点", "🇨🇳 台湾节点", "🇸🇬 狮城节点", "🇯🇵 日本节点", "🚀 手动切换"]
    },
    {
      name: "📢 谷歌FCM",
      type: "select",
      proxies: ["DIRECT", "🚀 节点选择", "🇺🇲 美国节点", "🇭🇰 香港节点", "🇨🇳 台湾节点", "🇸🇬 狮城节点", "🇯🇵 日本节点", "🇰🇷 韩国节点", "🚀 手动切换"]
    },
    {
      name: "Ⓜ️ 微软服务",
      type: "select",
      proxies: ["DIRECT", "🚀 节点选择", "🇺🇲 美国节点", "🇭🇰 香港节点", "🇨🇳 台湾节点", "🇸🇬 狮城节点", "🇯🇵 日本节点", "🇰🇷 韩国节点", "🚀 手动切换"]
    },
    {
      name: "Ⓜ️ 微软Bing",
      type: "select",
      proxies: ["DIRECT", "🚀 节点选择", "🇺🇲 美国节点", "🇭🇰 香港节点", "🇨🇳 台湾节点", "🇸🇬 狮城节点", "🇯🇵 日本节点", "🇰🇷 韩国节点", "🚀 手动切换"]
    },
    {
      name: "Ⓜ️ 微软云盘",
      type: "select",
      proxies: ["DIRECT", "🚀 节点选择", "🇺🇲 美国节点", "🇭🇰 香港节点", "🇨🇳 台湾节点", "🇸🇬 狮城节点", "🇯🇵 日本节点", "🇰🇷 韩国节点", "🚀 手动切换"]
    },
    {
      name: "🍎 苹果服务",
      type: "select",
      proxies: ["DIRECT", "🚀 节点选择", "🇺🇲 美国节点", "🇭🇰 香港节点", "🇨🇳 台湾节点", "🇸🇬 狮城节点", "🇯🇵 日本节点", "🇰🇷 韩国节点", "🚀 手动切换"]
    },
    {
      name: "🎮 游戏平台",
      type: "select",
      proxies: ["DIRECT", "🚀 节点选择", "🇺🇲 美国节点", "🇭🇰 香港节点", "🇨🇳 台湾节点", "🇸🇬 狮城节点", "🇯🇵 日本节点", "🇰🇷 韩国节点", "🚀 手动切换"]
    },
    {
      name: "🎶 网易音乐",
      type: "select",
      proxies: ["DIRECT", "🚀 节点选择", "♻️ 自动选择"]
    },
    {
      name: "🎯 全球直连",
      type: "select",
      proxies: ["DIRECT", "🚀 节点选择", "♻️ 自动选择"]
    },
    {
      name: "🛑 广告拦截",
      type: "select",
      proxies: ["REJECT", "DIRECT"]
    },
    {
      name: "🍃 应用净化",
      type: "select",
      proxies: ["REJECT", "DIRECT"]
    },
    {
      name: "🐟 漏网之鱼",
      type: "select",
      proxies: ["🚀 节点选择", "♻️ 自动选择", "DIRECT", "🇭🇰 香港节点", "🇨🇳 台湾节点", "🇸🇬 狮城节点", "🇯🇵 日本节点", "🇺🇲 美国节点", "🇰🇷 韩国节点", "🚀 手动切换"]
    },
    // --- 地区分组 (全部使用 url-test 自动测速) ---
    {
      name: "🇭🇰 香港节点",
      type: "url-test",
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50,
      proxies: getProxiesByRegex(/HK|Hong|Kong|香港|港/)
    },
    {
      name: "🇯🇵 日本节点",
      type: "url-test",
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50,
      proxies: getProxiesByRegex(/JP|Japan|日本|日|Osaka|Tokyo/)
    },
    {
      name: "🇺🇲 美国节点",
      type: "url-test",
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 150,
      proxies: getProxiesByRegex(/US|America|States|美国|美/)
    },
    {
      name: "🇨🇳 台湾节点",
      type: "url-test",
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50,
      proxies: getProxiesByRegex(/TW|Taiwan|台湾|台|Taipei/)
    },
    {
      name: "🇸🇬 狮城节点",
      type: "url-test",
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50,
      proxies: getProxiesByRegex(/SG|Singapore|狮城|新加坡/)
    },
    {
      name: "🇰🇷 韩国节点",
      type: "url-test",
      url: "http://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50,
      proxies: getProxiesByRegex(/KR|Korea|韩国|韩|Seoul/)
    },
    {
      name: "🎥 奈飞节点",
      type: "select",
      proxies: baseAllProxyChoices
    }
  ];

  config["proxy-groups"] = groups;

  // =========================================================
  // 5. 规则处理与重组
  // =========================================================
  const processedRules = rawRules.map(line => {
    if (line.includes("RULE-SET")) return line;

    const lowerLine = line.toLowerCase();

    // ChatGPT 相关
    if (
      lowerLine.includes("openai") ||
      lowerLine.includes("chatgpt") ||
      lowerLine.includes("auth0") ||
      lowerLine.includes("identrust")
    ) {
      const parts = line.split(",");
      parts[parts.length - 1] = "🤖 ChatGPT";
      return parts.join(",");
    }

    // Gemini 相关
    if (
      lowerLine.includes("gemini") ||
      lowerLine.includes("bard.google") ||
      lowerLine.includes("generativelanguage")
    ) {
      const parts = line.split(",");
      parts[parts.length - 1] = "🧠 Gemini";
      return parts.join(",");
    }

    // Copilot 相关
    if (
      lowerLine.includes("copilot") ||
      lowerLine.includes("sydney.bing") ||
      lowerLine.includes("bingapis")
    ) {
      const parts = line.split(",");
      parts[parts.length - 1] = "✈️ Copilot";
      return parts.join(",");
    }

    // 其他 AI
    if (lowerLine.includes("anthropic") || lowerLine.includes("claude")) {
      const parts = line.split(",");
      parts[parts.length - 1] = "💬 其他AI";
      return parts.join(",");
    }

    return line;
  });

  // 6. 组合最终规则
  const matchIndex = processedRules.findIndex(r => typeof r === "string" && r.trim().toUpperCase().startsWith("MATCH"));
  const safeMatchIndex = matchIndex >= 0 ? matchIndex : processedRules.length;

  const finalRules = [
    // 广告拦截 (优先级最高)
    "RULE-SET,ad_rule,🛑 广告拦截",
    "RULE-SET,app_rule,🍃 应用净化",

    // 中国域名/IP 直连（优先于其他分流规则）
    "RULE-SET,china_domain_rule,DIRECT",
    "RULE-SET,china_ip_rule,DIRECT",

    // 插入处理后的规则（GFWList 放到 MATCH/漏网之鱼 前）
    ...processedRules.slice(0, safeMatchIndex),
    "RULE-SET,gfwlist_rule,🚀 节点选择",
    ...processedRules.slice(safeMatchIndex)
  ];

  config.rules = finalRules;

  // DNS 默认值 (参考 YAML，尽量不破坏用户已有 DNS 配置)
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

  return config;
}