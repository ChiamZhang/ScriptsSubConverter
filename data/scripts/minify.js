// 最小化脚本 - 移除所有空白和注释，压缩内容
const lines = content.split('\n');
const processed = lines
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//') && !line.startsWith('#'))
    .join('\n');

return processed;
