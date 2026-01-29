// ZH: SingBox 精简配置脚本：轻量级配置，仅包含基本分流和节点选择
// EN: Minimal SingBox configuration script: lightweight config with basic routing and node selection

const path = require('path');
const converterPath = path.join(__dirname, '../../utils/singbox-converter.js');
const { clashToSingBox, detectConfigType } = require(converterPath);

/**
 * 主函数：生成精简的 SingBox 配置
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

  // ========== 简化日志配置 ==========
  singboxConfig.log = {
    disabled: false,
    level: 'info',
    timestamp: true
  };

  // ========== 简化 DNS 配置 ==========
  singboxConfig.dns = {
    servers: [
      {
        tag: 'dns_proxy',
        address: 'tls://1.1.1.1',
        address_resolver: 'dns_resolver'
      },
      {
        tag: 'dns_direct',
        address: '223.5.5.5',
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
  };

  // ========== 保持 inbounds 配置 ==========
  if (!singboxConfig.inbounds || singboxConfig.inbounds.length === 0) {
    singboxConfig.inbounds = [
      {
        type: 'mixed',
        tag: 'mixed-in',
        listen: '0.0.0.0',
        listen_port: 7890
      }
    ];
  }

  // ========== 构建简化策略组 ==========
  const proxyNodes = singboxConfig.outbounds.filter(o => 
    !['direct', 'block', 'dns', 'selector', 'urltest'].includes(o.type)
  );
  const proxyNames = proxyNodes.map(p => p.tag);

  // 清理旧策略组
  singboxConfig.outbounds = singboxConfig.outbounds.filter(o => 
    o.type === 'direct' || o.type === 'block' || o.type === 'dns' || 
    !['selector', 'urltest', 'fallback'].includes(o.type)
  );

  // 添加精简策略组
  const policyGroups = [
    {
      type: 'selector',
      tag: 'PROXY',
      outbounds: ['Auto', 'DIRECT', ...proxyNames]
    },
    {
      type: 'urltest',
      tag: 'Auto',
      outbounds: proxyNames,
      url: 'https://www.gstatic.com/generate_204',
      interval: '300s',
      tolerance: 50
    }
  ];

  // 插入策略组
  singboxConfig.outbounds.splice(3, 0, ...policyGroups);

  // ========== 简化路由规则 ==========
  singboxConfig.route = {
    rules: [
      // 私有地址直连
      {
        ip_cidr: [
          '10.0.0.0/8',
          '172.16.0.0/12',
          '192.168.0.0/16',
          '127.0.0.0/8'
        ],
        outbound: 'DIRECT'
      },
      // 中国 IP 直连
      {
        geoip: ['cn'],
        outbound: 'DIRECT'
      },
      // 中国网站直连
      {
        geosite: ['cn'],
        outbound: 'DIRECT'
      }
    ],
    final: 'PROXY',
    auto_detect_interface: true
  };

  // ========== 基础实验性功能 ==========
  singboxConfig.experimental = {
    cache_file: {
      enabled: true
    },
    clash_api: {
      external_controller: '127.0.0.1:9090'
    }
  };

  // 返回 SingBox 配置对象（会被自动转换为 JSON）
  return singboxConfig;
}

module.exports = main;
