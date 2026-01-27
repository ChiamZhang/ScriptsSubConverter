// ZH: 订阅压缩脚本：逐行裁剪、去注释、去空白与多余空格，压缩体积同时保留节点行
// EN: Subscription minifier: trims lines, strips comments/blank/extra spaces to shrink size while keeping nodes

// 最小化脚本 - 移除所有空白和注释，压缩内容
const lines = content.split('\n');
const processed = lines
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//') && !line.startsWith('#'))
    .join('\n');

return processed;
