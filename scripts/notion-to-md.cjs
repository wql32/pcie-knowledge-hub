#!/usr/bin/env node
/**
 * Notion → Markdown converter for PCIe Hub knowledge base
 * Fetches Notion pages and converts to Markdown for VitePress
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { URL } = require('url');

const NOTION_KEY = fs.readFileSync(os.homedir() + '/.config/notion/api_key', 'utf8').trim();

function notionRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://api.notion.com/v1${path}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Bearer ${NOTION_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(rawData));
        } catch (e) {
          // If JSON parse fails, try to return the raw string
          resolve(rawData);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function getPlainText(richText = []) {
  return richText.map(t => t.plain_text || '').join('');
}

function blockToMarkdown(block, depth = 0) {
  const indent = '  '.repeat(depth);
  const type = block.type;
  const content = block[type] || {};
  const text = getPlainText(content.rich_text);
  const lang = content.language || '';

  switch (type) {
    case 'heading_1': return `# ${text}`;
    case 'heading_2': return `## ${text}`;
    case 'heading_3': return `### ${text}`;
    case 'paragraph': return text || '';
    case 'quote': return `> ${text}`;
    case 'callout': {
      const icon = (content.icon || {}).emoji || '';
      return `> **${icon}** ${text}`;
    }
    case 'bulleted_list_item': return `${indent}- ${text}`;
    case 'numbered_list_item': return `${indent}1. ${text}`;
    case 'code': return `\`\`\`${lang}\n${text}\n\`\`\``;
    case 'divider': return '---';
    case 'image': {
      const imgUrl = content.file?.url || content.external?.url || '';
      const caption = getPlainText(content.caption);
      return imgUrl ? `![${caption}](${imgUrl})` : '';
    }
    default: return text ? `<!-- ${type}: ${text} -->` : '';
  }
}

async function fetchBlocks(blockId) {
  const blocks = [];
  let cursor;

  do {
    const qs = cursor ? `?page_size=100&start_cursor=${cursor}` : '?page_size=100';
    const resp = await notionRequest('GET', `/blocks/${blockId}/children${qs}`);
    const data = typeof resp === 'string' ? JSON.parse(resp) : resp;
    
    for (const block of data.results || []) {
      const b = { ...block, _depth: 0 };
      blocks.push(b);
      
      if (block.has_children) {
        const children = await fetchBlocks(block.id);
        children.forEach(c => { c._depth = c._depth + 1; });
        blocks.push(...children);
      }
    }
    
    cursor = data.next_cursor;
  } while (data.has_more);

  return blocks;
}

async function pageToMarkdown(pageId, title) {
  const blocks = await fetchBlocks(pageId);
  const lines = [`# ${title}`, ''];
  
  let inList = false;
  for (const block of blocks) {
    const md = blockToMarkdown(block, block._depth);
    if (md) {
      // Add spacing between list items
      if (block.type.includes('list_item') && !inList) {
        lines.push('');
        inList = true;
      } else if (!block.type.includes('list_item')) {
        inList = false;
      }
      lines.push(md);
    }
  }

  return `---
title: ${title}
---

${lines.join('\n')}
`;
}

async function main() {
  const pages = [
    ['31b1f64a-f1bd-815a-8b19-f5b4a44bb977', '🚀 PCIe Hub 学习中心', 'pcie/hub-overview'],
    ['3181f64a-f1bd-81c2-9893-eea2b09219cf', "🚀 along 的 PCIe 7.0 知识库", 'pcie/pcie7-knowledge'],
    ['3221f64a-f1bd-8171-8afb-f98425a3736c', '📘 PCIe TLP Byte Enable 规则详解', 'pcie/tlp-byte-enable'],
    ['3221f64a-f1bd-81d4-b34a-c1c49619b521', '📘 PCIe Completion TLP 处理规则', 'pcie/completion-tlp'],
    ['27f1f64a-f1bd-80fd-aae3-ec4e931ae977', 'PCIE', 'pcie/pcie-main'],
  ];

  const docsDir = path.join(__dirname, '..', 'docs');
  fs.mkdirSync(docsDir, { recursive: true });

  for (const [pageId, title, outPath] of pages) {
    console.log(`Fetching: ${title}...`);
    try {
      const md = await pageToMarkdown(pageId, title);
      const outFile = path.join(docsDir, `${outPath}.md`);
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      fs.writeFileSync(outFile, md);
      console.log(`  -> Saved to ${outFile}`);
    } catch (e) {
      console.error(`  -> Error: ${e.message}`);
    }
  }
  
  console.log('\nDone! Run `npm run build` to rebuild the site.');
}

main().catch(console.error);