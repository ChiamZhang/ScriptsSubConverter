/**
 * SingBox 与 Clash 配置格式转换工具
 * 
 * 功能：
 * 1. Clash YAML 转 SingBox JSON
 * 2. SingBox JSON 转 Clash YAML
 * 3. 支持节点、规则、策略组等完整转换
 */

const yaml = require('js-yaml');

/**
 * Clash 协议类型映射到 SingBox
 */
const PROTOCOL_MAP = {
  'ss': 'shadowsocks',
  'shadowsocks': 'shadowsocks',
  'ssr': 'shadowsocksr',
  'shadowsocksr': 'shadowsocksr',
  'vmess': 'vmess',
  'vless': 'vless',
  'trojan': 'trojan',
  'hysteria': 'hysteria',
  'hysteria2': 'hysteria2',
  'wireguard': 'wireguard',
  'http': 'http',
  'https': 'http',
  'socks': 'socks',
  'socks5': 'socks'
};

/**
 * SingBox 协议类型映射到 Clash
 */
const PROTOCOL_MAP_REVERSE = {
  'shadowsocks': 'ss',
  'shadowsocksr': 'ssr',
  'vmess': 'vmess',
  'vless': 'vless',
  'trojan': 'trojan',
  'hysteria': 'hysteria',
  'hysteria2': 'hysteria2',
  'wireguard': 'wireguard',
  'http': 'http',
  'socks': 'socks5'
};

/**
 * 转换 Clash 节点到 SingBox 格式
 */
function convertClashProxyToSingBox(proxy) {
  const type = PROTOCOL_MAP[proxy.type.toLowerCase()] || proxy.type;
  
  const singboxProxy = {
    type,
    tag: proxy.name,
    server: proxy.server,
    server_port: proxy.port
  };

  switch (type) {
    case 'shadowsocks':
      singboxProxy.method = proxy.cipher || proxy.method;
      singboxProxy.password = proxy.password;
      if (proxy.plugin) {
        singboxProxy.plugin = proxy.plugin === 'obfs' ? 'obfs-local' : proxy.plugin;
        singboxProxy.plugin_opts = proxy['plugin-opts'] ? JSON.stringify(proxy['plugin-opts']) : '';
      }
      break;

    case 'shadowsocksr':
      singboxProxy.method = proxy.cipher;
      singboxProxy.password = proxy.password;
      singboxProxy.protocol = proxy.protocol;
      singboxProxy.protocol_param = proxy['protocol-param'] || '';
      singboxProxy.obfs = proxy.obfs;
      singboxProxy.obfs_param = proxy['obfs-param'] || '';
      break;

    case 'vmess':
      singboxProxy.uuid = proxy.uuid;
      singboxProxy.alter_id = proxy.alterId || 0;
      singboxProxy.security = proxy.cipher || 'auto';
      
      // Transport 配置
      if (proxy.network && proxy.network !== 'tcp') {
        const transport = { type: proxy.network };
        
        if (proxy.network === 'ws') {
          transport.path = proxy['ws-path'] || proxy['ws-opts']?.path || '/';
          const headers = proxy['ws-headers'] || proxy['ws-opts']?.headers || {};
          if (Object.keys(headers).length > 0) {
            transport.headers = headers;
          }
        } else if (proxy.network === 'grpc') {
          transport.service_name = proxy['grpc-service-name'] || proxy['grpc-opts']?.['grpc-service-name'] || '';
        } else if (proxy.network === 'http' || proxy.network === 'h2') {
          transport.type = 'http';
          transport.path = proxy['h2-opts']?.path?.[0] || proxy.path || '/';
          transport.host = proxy['h2-opts']?.host || proxy.host ? [proxy.host] : [];
        }
        
        singboxProxy.transport = transport;
      }
      break;

    case 'vless':
      singboxProxy.uuid = proxy.uuid;
      singboxProxy.flow = proxy.flow || '';
      
      // Transport 配置
      if (proxy.network && proxy.network !== 'tcp') {
        const transport = { type: proxy.network };
        
        if (proxy.network === 'ws') {
          transport.path = proxy['ws-opts']?.path || '/';
          const headers = proxy['ws-opts']?.headers || {};
          if (Object.keys(headers).length > 0) {
            transport.headers = headers;
          }
        } else if (proxy.network === 'grpc') {
          transport.service_name = proxy['grpc-opts']?.['grpc-service-name'] || '';
        }
        
        singboxProxy.transport = transport;
      }
      break;

    case 'trojan':
      singboxProxy.password = proxy.password;
      
      // Transport 配置
      if (proxy.network && proxy.network !== 'tcp') {
        const transport = { type: proxy.network };
        
        if (proxy.network === 'ws') {
          transport.path = proxy['ws-opts']?.path || '/';
          const headers = proxy['ws-opts']?.headers || {};
          if (Object.keys(headers).length > 0) {
            transport.headers = headers;
          }
        } else if (proxy.network === 'grpc') {
          transport.service_name = proxy['grpc-opts']?.['grpc-service-name'] || '';
        }
        
        singboxProxy.transport = transport;
      }
      break;

    case 'hysteria2':
      singboxProxy.password = proxy.password || proxy.auth;
      if (proxy.up) singboxProxy.up_mbps = parseInt(proxy.up);
      if (proxy.down) singboxProxy.down_mbps = parseInt(proxy.down);
      if (proxy.obfs) {
        singboxProxy.obfs = {
          type: proxy.obfs,
          password: proxy['obfs-password'] || ''
        };
      }
      break;

    case 'wireguard':
      singboxProxy.private_key = proxy['private-key'];
      singboxProxy.local_address = [proxy.ip || proxy['self-ip']];
      if (proxy.ipv6) singboxProxy.local_address.push(proxy.ipv6);
      
      singboxProxy.peers = [{
        server: proxy.server,
        server_port: proxy.port,
        public_key: proxy['public-key'],
        pre_shared_key: proxy['pre-shared-key'] || ''
      }];
      
      if (proxy['allowed-ips']) {
        singboxProxy.peers[0].allowed_ips = proxy['allowed-ips'];
      }
      break;

    case 'http':
      if (proxy.username) singboxProxy.username = proxy.username;
      if (proxy.password) singboxProxy.password = proxy.password;
      break;

    case 'socks':
      singboxProxy.version = '5';
      if (proxy.username) singboxProxy.username = proxy.username;
      if (proxy.password) singboxProxy.password = proxy.password;
      break;
  }

  // TLS 配置
  if (proxy.tls || proxy.sni || proxy['skip-cert-verify']) {
    const tls = { enabled: true };
    if (proxy.sni || proxy.servername) {
      tls.server_name = proxy.sni || proxy.servername;
    }
    if (proxy['skip-cert-verify'] !== undefined) {
      tls.insecure = proxy['skip-cert-verify'];
    }
    if (proxy.alpn) {
      tls.alpn = Array.isArray(proxy.alpn) ? proxy.alpn : [proxy.alpn];
    }
    singboxProxy.tls = tls;
  }

  return singboxProxy;
}

/**
 * 转换 SingBox 节点到 Clash 格式
 */
function convertSingBoxProxyToClash(proxy) {
  const type = PROTOCOL_MAP_REVERSE[proxy.type] || proxy.type;
  
  const clashProxy = {
    name: proxy.tag,
    type,
    server: proxy.server,
    port: proxy.server_port
  };

  switch (proxy.type) {
    case 'shadowsocks':
      clashProxy.cipher = proxy.method;
      clashProxy.password = proxy.password;
      if (proxy.plugin) {
        clashProxy.plugin = proxy.plugin === 'obfs-local' ? 'obfs' : proxy.plugin;
        if (proxy.plugin_opts) {
          try {
            clashProxy['plugin-opts'] = typeof proxy.plugin_opts === 'string' 
              ? JSON.parse(proxy.plugin_opts) 
              : proxy.plugin_opts;
          } catch (e) {
            clashProxy['plugin-opts'] = { mode: 'tls' };
          }
        }
      }
      break;

    case 'shadowsocksr':
      clashProxy.cipher = proxy.method;
      clashProxy.password = proxy.password;
      clashProxy.protocol = proxy.protocol;
      clashProxy['protocol-param'] = proxy.protocol_param || '';
      clashProxy.obfs = proxy.obfs;
      clashProxy['obfs-param'] = proxy.obfs_param || '';
      break;

    case 'vmess':
      clashProxy.uuid = proxy.uuid;
      clashProxy.alterId = proxy.alter_id || 0;
      clashProxy.cipher = proxy.security || 'auto';
      
      // Transport 配置
      if (proxy.transport && proxy.transport.type) {
        clashProxy.network = proxy.transport.type;
        
        if (proxy.transport.type === 'ws') {
          clashProxy['ws-opts'] = {
            path: proxy.transport.path || '/',
            headers: proxy.transport.headers || {}
          };
        } else if (proxy.transport.type === 'grpc') {
          clashProxy.network = 'grpc';
          clashProxy['grpc-opts'] = {
            'grpc-service-name': proxy.transport.service_name || ''
          };
        } else if (proxy.transport.type === 'http') {
          clashProxy.network = 'h2';
          clashProxy['h2-opts'] = {
            path: [proxy.transport.path || '/'],
            host: proxy.transport.host || []
          };
        }
      }
      break;

    case 'vless':
      clashProxy.uuid = proxy.uuid;
      if (proxy.flow) clashProxy.flow = proxy.flow;
      
      // Transport 配置
      if (proxy.transport && proxy.transport.type) {
        clashProxy.network = proxy.transport.type;
        
        if (proxy.transport.type === 'ws') {
          clashProxy['ws-opts'] = {
            path: proxy.transport.path || '/',
            headers: proxy.transport.headers || {}
          };
        } else if (proxy.transport.type === 'grpc') {
          clashProxy['grpc-opts'] = {
            'grpc-service-name': proxy.transport.service_name || ''
          };
        }
      }
      break;

    case 'trojan':
      clashProxy.password = proxy.password;
      
      // Transport 配置
      if (proxy.transport && proxy.transport.type) {
        clashProxy.network = proxy.transport.type;
        
        if (proxy.transport.type === 'ws') {
          clashProxy['ws-opts'] = {
            path: proxy.transport.path || '/',
            headers: proxy.transport.headers || {}
          };
        } else if (proxy.transport.type === 'grpc') {
          clashProxy['grpc-opts'] = {
            'grpc-service-name': proxy.transport.service_name || ''
          };
        }
      }
      break;

    case 'hysteria2':
      clashProxy.password = proxy.password;
      if (proxy.up_mbps) clashProxy.up = `${proxy.up_mbps} Mbps`;
      if (proxy.down_mbps) clashProxy.down = `${proxy.down_mbps} Mbps`;
      if (proxy.obfs) {
        clashProxy.obfs = proxy.obfs.type;
        clashProxy['obfs-password'] = proxy.obfs.password || '';
      }
      break;

    case 'wireguard':
      clashProxy['private-key'] = proxy.private_key;
      clashProxy.ip = proxy.local_address?.[0] || '';
      if (proxy.local_address?.[1]) {
        clashProxy.ipv6 = proxy.local_address[1];
      }
      
      if (proxy.peers && proxy.peers[0]) {
        const peer = proxy.peers[0];
        clashProxy['public-key'] = peer.public_key;
        if (peer.pre_shared_key) {
          clashProxy['pre-shared-key'] = peer.pre_shared_key;
        }
        if (peer.allowed_ips) {
          clashProxy['allowed-ips'] = peer.allowed_ips;
        }
      }
      break;

    case 'http':
      if (proxy.username) clashProxy.username = proxy.username;
      if (proxy.password) clashProxy.password = proxy.password;
      break;

    case 'socks':
      clashProxy.type = 'socks5';
      if (proxy.username) clashProxy.username = proxy.username;
      if (proxy.password) clashProxy.password = proxy.password;
      break;
  }

  // TLS 配置
  if (proxy.tls && proxy.tls.enabled) {
    clashProxy.tls = true;
    if (proxy.tls.server_name) {
      clashProxy.sni = proxy.tls.server_name;
    }
    if (proxy.tls.insecure !== undefined) {
      clashProxy['skip-cert-verify'] = proxy.tls.insecure;
    }
    if (proxy.tls.alpn) {
      clashProxy.alpn = proxy.tls.alpn;
    }
  }

  return clashProxy;
}

/**
 * 转换 Clash 规则到 SingBox 格式
 */
function convertClashRuleToSingBox(rule, policyName) {
  const parts = rule.split(',');
  if (parts.length < 2) return null;

  const ruleType = parts[0].trim();
  const ruleValue = parts[1].trim();
  const policy = policyName || parts[2]?.trim() || 'PROXY';

  const singboxRule = {
    outbound: policy
  };

  switch (ruleType) {
    case 'DOMAIN':
      singboxRule.domain = [ruleValue];
      break;
    case 'DOMAIN-SUFFIX':
      singboxRule.domain_suffix = [ruleValue];
      break;
    case 'DOMAIN-KEYWORD':
      singboxRule.domain_keyword = [ruleValue];
      break;
    case 'IP-CIDR':
    case 'IP-CIDR6':
      singboxRule.ip_cidr = [ruleValue];
      break;
    case 'GEOIP':
      singboxRule.geoip = [ruleValue];
      break;
    case 'GEOSITE':
      singboxRule.geosite = [ruleValue];
      break;
    case 'MATCH':
    case 'FINAL':
      return null; // SingBox 使用 final 字段
    default:
      return null;
  }

  return singboxRule;
}

/**
 * 转换 SingBox 规则到 Clash 格式
 */
function convertSingBoxRuleToClash(rule) {
  const rules = [];
  const outbound = rule.outbound || 'PROXY';

  if (rule.domain) {
    rule.domain.forEach(d => rules.push(`DOMAIN,${d},${outbound}`));
  }
  if (rule.domain_suffix) {
    rule.domain_suffix.forEach(d => rules.push(`DOMAIN-SUFFIX,${d},${outbound}`));
  }
  if (rule.domain_keyword) {
    rule.domain_keyword.forEach(d => rules.push(`DOMAIN-KEYWORD,${d},${outbound}`));
  }
  if (rule.ip_cidr) {
    rule.ip_cidr.forEach(ip => {
      const isIPv6 = ip.includes(':');
      rules.push(`${isIPv6 ? 'IP-CIDR6' : 'IP-CIDR'},${ip},${outbound}`);
    });
  }
  if (rule.geoip) {
    rule.geoip.forEach(g => rules.push(`GEOIP,${g},${outbound}`));
  }
  if (rule.geosite) {
    rule.geosite.forEach(g => rules.push(`GEOSITE,${g},${outbound}`));
  }

  return rules;
}

/**
 * Clash 配置转 SingBox 配置
 */
function clashToSingBox(clashConfig, baseTemplate = null) {
  let clash;
  if (typeof clashConfig === 'string') {
    try {
      clash = yaml.load(clashConfig);
    } catch (e) {
      throw new Error(`Clash YAML 解析失败: ${e.message}`);
    }
  } else {
    clash = clashConfig;
  }

  // 使用基础模板或默认模板
  const singbox = baseTemplate || {
    log: {
      disabled: false,
      level: 'info',
      timestamp: true
    },
    dns: {
      servers: [
        {
          tag: 'dns_proxy',
          address: 'tls://1.1.1.1',
          address_resolver: 'dns_resolver'
        },
        {
          tag: 'dns_direct',
          address: 'h3://dns.alidns.com/dns-query',
          address_resolver: 'dns_resolver',
          detour: 'DIRECT'
        },
        {
          tag: 'dns_resolver',
          address: '223.5.5.5',
          detour: 'DIRECT'
        }
      ],
      rules: [],
      final: 'dns_direct'
    },
    inbounds: [
      {
        type: 'mixed',
        tag: 'mixed-in',
        listen: '0.0.0.0',
        listen_port: clash.port || clash['mixed-port'] || 7890
      }
    ],
    outbounds: [],
    route: {
      rules: [],
      auto_detect_interface: true
    }
  };

  // 转换节点
  if (clash.proxies && Array.isArray(clash.proxies)) {
    // 添加基础出站
    singbox.outbounds.push(
      { type: 'direct', tag: 'DIRECT' },
      { type: 'block', tag: 'REJECT' },
      { type: 'dns', tag: 'dns-out' }
    );

    clash.proxies.forEach(proxy => {
      try {
        const singboxProxy = convertClashProxyToSingBox(proxy);
        singbox.outbounds.push(singboxProxy);
      } catch (e) {
        console.error(`转换节点失败: ${proxy.name}`, e.message);
      }
    });
  }

  // 转换策略组
  if (clash['proxy-groups'] && Array.isArray(clash['proxy-groups'])) {
    clash['proxy-groups'].forEach(group => {
      // 转换类型映射（参考 subconverter 的实现）
      let singboxType;
      switch (group.type) {
        case 'select':
          singboxType = 'selector';
          break;
        case 'url-test':
        case 'fallback':
        case 'load-balance':
          singboxType = 'urltest';
          break;
        default:
          singboxType = group.type;
      }
      
      const singboxGroup = {
        type: singboxType,
        tag: group.name,
        outbounds: group.proxies || []
      };

      // 只有 url-test 类型才添加健康检查参数（subconverter 标准）
      if (group.type === 'url-test') {
        singboxGroup.url = group.url || 'https://www.gstatic.com/generate_204';
        singboxGroup.interval = group.interval ? `${group.interval}s` : '300s';
        if (group.tolerance && group.tolerance > 0) {
          singboxGroup.tolerance = group.tolerance;
        }
      }

      singbox.outbounds.push(singboxGroup);
    });
  }

  // 转换规则
  if (clash.rules && Array.isArray(clash.rules)) {
    clash.rules.forEach(rule => {
      const singboxRule = convertClashRuleToSingBox(rule);
      if (singboxRule) {
        singbox.route.rules.push(singboxRule);
      }
    });
  }

  // 设置默认出站
  singbox.route.final = 'PROXY';

  return singbox;
}

/**
 * SingBox 配置转 Clash 配置
 */
function singBoxToClash(singboxConfig, baseTemplate = null) {
  let singbox;
  if (typeof singboxConfig === 'string') {
    try {
      singbox = JSON.parse(singboxConfig);
    } catch (e) {
      throw new Error(`SingBox JSON 解析失败: ${e.message}`);
    }
  } else {
    singbox = singboxConfig;
  }

  // 使用基础模板或默认模板
  const clash = baseTemplate || {
    port: 7890,
    'socks-port': 7891,
    'allow-lan': true,
    mode: 'rule',
    'log-level': 'info',
    'external-controller': '127.0.0.1:9090',
    dns: {
      enable: true,
      listen: '0.0.0.0:53',
      'enhanced-mode': 'fake-ip',
      nameserver: ['223.5.5.5', '119.29.29.29'],
      fallback: ['8.8.8.8', '1.1.1.1']
    },
    proxies: [],
    'proxy-groups': [],
    rules: []
  };

  // 从 inbounds 提取端口
  if (singbox.inbounds && Array.isArray(singbox.inbounds)) {
    const mixedIn = singbox.inbounds.find(i => i.type === 'mixed');
    if (mixedIn) {
      clash['mixed-port'] = mixedIn.listen_port || 7890;
    }
  }

  // 转换节点
  if (singbox.outbounds && Array.isArray(singbox.outbounds)) {
    singbox.outbounds.forEach(outbound => {
      // 跳过特殊出站和策略组
      if (['direct', 'block', 'dns'].includes(outbound.type)) {
        return;
      }
      
      // 处理策略组（selector, urltest）
      if (['selector', 'urltest'].includes(outbound.type)) {
        const group = {
          name: outbound.tag,
          type: outbound.type === 'selector' ? 'select' : 'url-test', // urltest -> url-test
          proxies: outbound.outbounds || []
        };

        // urltest 的健康检查参数
        if (outbound.type === 'urltest') {
          group.url = outbound.url || 'https://www.gstatic.com/generate_204';
          group.interval = parseInt(outbound.interval) || 300;
          if (outbound.tolerance) {
            group.tolerance = outbound.tolerance;
          }
        }

        clash['proxy-groups'].push(group);
        return;
      }

      try {
        const clashProxy = convertSingBoxProxyToClash(outbound);
        clash.proxies.push(clashProxy);
      } catch (e) {
        console.error(`转换节点失败: ${outbound.tag}`, e.message);
      }
    });
  }

  // 转换规则
  if (singbox.route && singbox.route.rules && Array.isArray(singbox.route.rules)) {
    singbox.route.rules.forEach(rule => {
      const clashRules = convertSingBoxRuleToClash(rule);
      clash.rules.push(...clashRules);
    });
  }

  // 添加默认规则
  if (singbox.route && singbox.route.final) {
    clash.rules.push(`MATCH,${singbox.route.final}`);
  }

  return clash;
}

/**
 * 检测配置类型
 */
function detectConfigType(content) {
  if (typeof content === 'object') {
    if (content.outbounds || content.inbounds) {
      return 'singbox';
    }
    if (content.proxies || content['proxy-groups']) {
      return 'clash';
    }
  }

  if (typeof content === 'string') {
    const trimmed = content.trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        return detectConfigType(parsed);
      } catch (e) {
        return 'unknown';
      }
    }
    
    try {
      const parsed = yaml.load(trimmed);
      return detectConfigType(parsed);
    } catch (e) {
      return 'unknown';
    }
  }

  return 'unknown';
}

module.exports = {
  clashToSingBox,
  singBoxToClash,
  convertClashProxyToSingBox,
  convertSingBoxProxyToClash,
  detectConfigType
};
