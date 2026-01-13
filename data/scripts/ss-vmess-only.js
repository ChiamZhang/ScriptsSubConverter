// 代理类型过滤脚本 - 只保留 ss:// 和 vmess:// 代理

const lines = content.split('\n');
const result = lines
    .filter(line => {
        const trimmed = line.trim();
        return (trimmed.startsWith('ss://') || trimmed.startsWith('vmess://'));
    })
    .join('\n');

return '# 已过滤 - 仅包含 SS 和 VMess 代理\n# 节点数: ' + lines.filter(l => l.includes('://')).length + '\n\n' + result;
