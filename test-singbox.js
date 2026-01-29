#!/usr/bin/env node
// 测试 SingBox 转换功能

const path = require('path');
const fs = require('fs');

// 测试 executeScript 函数
function executeScript(content, scriptCode, scriptName = '') {
  try {
    // 根据脚本名称判断目标格式
    const isSingBoxScript = scriptName.toLowerCase().includes('singbox') || 
                            scriptName.toLowerCase().includes('sing-box');
    
    // 检测脚本类型
    const isClashFormat = scriptCode.includes('function main') || 
                          scriptCode.includes('config.proxies') ||
                          scriptCode.includes('proxy-groups');
    
    const isSingBoxFormat = isSingBoxScript ||
                            scriptCode.includes('singbox') || 
                            scriptCode.includes('SingBox') ||
                            scriptCode.includes('outbounds') ||
                            scriptCode.includes('clashToSingBox') ||
                            scriptCode.includes('singBoxToClash');
    
    if (isClashFormat || isSingBoxFormat) {
      // Clash/SingBox 配置格式：处理 YAML/JSON -> 脚本 -> JSON/YAML
      let config;
      let isJsonInput = false;
      
      // 尝试解析为 JSON（SingBox 格式或 Clash JSON）
      try {
        config = JSON.parse(content);
        isJsonInput = true;
      } catch (e) {
        // 如果不是 JSON，尝试解析为 YAML（Clash 格式）
        const yaml = require('js-yaml');
        try {
          config = yaml.load(content);
        } catch (yamlError) {
          console.error('配置解析失败:', yamlError);
          return content;
        }
      }
      
      // 执行脚本中的 main 函数
      const scriptFunc = new Function('config', scriptCode + '\nreturn main(config);');
      const processedConfig = scriptFunc(config);
      
      // 如果脚本返回字符串，直接返回
      if (typeof processedConfig === 'string') {
        return processedConfig;
      }
      
      // 如果脚本输出了文本配置，直接返回
      if (processedConfig && typeof processedConfig.text === 'string') {
        return processedConfig.text;
      }

      // 检测输出格式：优先根据脚本名称判断
      const shouldOutputSingBox = isSingBoxScript || 
                                  (processedConfig && (processedConfig.outbounds || processedConfig.inbounds));
      
      if (shouldOutputSingBox) {
        // 输出 SingBox JSON 格式
        return JSON.stringify(processedConfig, null, 2);
      }

      // 否则返回 YAML 格式（Clash）
      const yaml = require('js-yaml');
      return yaml.dump(processedConfig, { 
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
      });
    } else {
      // 简单文本格式：return content...
      const fn = new Function('content', scriptCode);
      const result = fn(content);
      return result || content;
    }
  } catch (error) {
    console.error('脚本执行错误:', error);
    return content; // 失败时返回原始内容
  }
}

// 测试用的 Clash 配置
const testClashYaml = `
proxies:
  - name: test-ss
    type: ss
    server: 1.2.3.4
    port: 8388
    cipher: aes-256-gcm
    password: password123
    
  - name: test-vmess
    type: vmess
    server: example.com
    port: 443
    uuid: 12345678-1234-1234-1234-123456789012
    alterId: 0
    cipher: auto

proxy-groups:
  - name: PROXY
    type: select
    proxies:
      - test-ss
      - test-vmess
      - DIRECT
      
  - name: AUTO
    type: url-test
    proxies:
      - test-ss
      - test-vmess
    url: http://www.gstatic.com/generate_204
    interval: 300

rules:
  - DOMAIN-SUFFIX,google.com,PROXY
  - GEOIP,CN,DIRECT
  - MATCH,PROXY
`;

console.log('='.repeat(60));
console.log('测试 1: singbox-full 脚本（应该输出 JSON）');
console.log('='.repeat(60));

const scriptPath = path.join(__dirname, 'data/scripts/singbox-full.js');
const scriptCode = fs.readFileSync(scriptPath, 'utf8');
const result1 = executeScript(testClashYaml, scriptCode, 'singbox-full');

console.log('输出格式:', result1.trim().startsWith('{') ? 'JSON ✓' : 'YAML ✗');
console.log('输出长度:', result1.length, 'bytes');

try {
  const parsed = JSON.parse(result1);
  console.log('JSON 解析:', '成功 ✓');
  console.log('是否有 outbounds:', parsed.outbounds ? `是 ✓ (${parsed.outbounds.length} 个)` : '否 ✗');
  console.log('是否有 dns:', parsed.dns ? '是 ✓' : '否 ✗');
  console.log('是否有 route:', parsed.route ? '是 ✓' : '否 ✗');
} catch (e) {
  console.log('JSON 解析:', '失败 ✗', e.message);
}

console.log('\n输出预览（前 500 字符）:');
console.log(result1.substring(0, 500));

console.log('\n' + '='.repeat(60));
console.log('测试 2: clash-full 脚本（应该输出 YAML）');
console.log('='.repeat(60));

const clashScriptPath = path.join(__dirname, 'data/scripts/clash-full.js');
if (fs.existsSync(clashScriptPath)) {
  const clashScriptCode = fs.readFileSync(clashScriptPath, 'utf8');
  const result2 = executeScript(testClashYaml, clashScriptCode, 'clash-full');
  
  console.log('输出格式:', result2.trim().startsWith('proxies:') ? 'YAML ✓' : 'JSON ✗');
  console.log('输出长度:', result2.length, 'bytes');
  console.log('\n输出预览（前 300 字符）:');
  console.log(result2.substring(0, 300));
} else {
  console.log('clash-full.js 不存在，跳过测试');
}

console.log('\n' + '='.repeat(60));
console.log('测试完成！');
console.log('='.repeat(60));
