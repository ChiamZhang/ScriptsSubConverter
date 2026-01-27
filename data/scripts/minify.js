// Minify - 内容压缩脚本
// 功能：移除订阅内容中的所有空白行、注释和多余空格，压缩文件大小
// 适用：需要减小订阅文件体积的场景

// 最小化脚本 - 移除所有空白和注释，压缩内容
const lines = content.split('\n');
const processed = lines
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//') && !line.startsWith('#'))
    .join('\n');

return processed;
