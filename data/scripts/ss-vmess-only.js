// SS & VMess Only - 代理类型过滤脚本
// 功能：过滤订阅内容，只保留 Shadowsocks (ss://) 和 VMess (vmess://) 类型的代理节点
// 适用：只支持特定协议的客户端或需要过滤其他协议的场景

// 代理类型过滤脚本 - 只保留 ss:// 和 vmess:// 代理

const lines = content.split('\n');
const result = lines
    .filter(line => {
        const trimmed = line.trim();
        return (trimmed.startsWith('ss://') || trimmed.startsWith('vmess://'));
    })
    .join('\n');

return '# 已过滤 - 仅包含 SS 和 VMess 代理\n# 节点数: ' + lines.filter(l => l.includes('://')).length + '\n\n' + result;
