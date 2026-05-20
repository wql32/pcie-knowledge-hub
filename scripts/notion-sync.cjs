const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');

const NOTION_KEY = fs.readFileSync(os.homedir() + '/.config/notion/api_key', 'utf8').trim();

function notionGet(urlPath) {
  return new Promise(function(resolve, reject) {
    const url = new URL('https://api.notion.com/v1' + urlPath);
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + NOTION_KEY,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(opts, function(res) {
      let data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function getText(rich) {
  rich = rich || [];
  return rich.map(function(t) { return t.plain_text || ''; }).join('');
}

function renderBlock(block) {
  const type = block.type;
  const c = block[type] || {};
  const text = getText(c.rich_text);
  switch (type) {
    case 'heading_1': return '# ' + text;
    case 'heading_2': return '## ' + text;
    case 'heading_3': return '### ' + text;
    case 'paragraph': return text;
    case 'quote': return '> ' + text;
    case 'callout': return '> **' + ((c.icon || {}).emoji || '') + '** ' + text;
    case 'bulleted_list_item': return '- ' + text;
    case 'numbered_list_item': return '1. ' + text;
    case 'code': return '```' + (c.language || '') + '\n' + text + '\n```';
    case 'divider': return '---';
    case 'image': {
      const u = (c.file && c.file.url) || (c.external && c.external.url) || '';
      return u ? '![' + getText(c.caption) + '](' + u + ')' : '';
    }
    default: return text || '';
  }
}

async function getAllBlocks(blockId) {
  const blocks = [];
  let cursor = null;
  var resp;
  do {
    const qs = cursor ? '?page_size=100&start_cursor=' + cursor : '?page_size=100';
    resp = await notionGet('/blocks/' + blockId + '/children' + qs);
    for (var i = 0; i < (resp.results || []).length; i++) {
      var b = resp.results[i];
      blocks.push(b);
      if (b.has_children && b.type !== 'child_page' && b.type !== 'child_database') {
        var kids = await getAllBlocks(b.id);
        for (var j = 0; j < kids.length; j++) {
          blocks.push(kids[j]);
        }
      }
    }
    cursor = resp.next_cursor;
  } while (resp.has_more);
  return blocks;
}

async function toMarkdown(pageId, title) {
  var blocks = await getAllBlocks(pageId);
  var lines = ['---', 'title: ' + title, '---\n', '# ' + title, ''];
  for (var i = 0; i < blocks.length; i++) {
    var md = renderBlock(blocks[i]);
    if (md) {
      lines.push(md);
      lines.push('');
    }
  }
  return lines.join('\n');
}

var pages = [
  ['31b1f64a-f1bd-815a-8b19-f5b4a44bb977', 'PCIe Hub 学习中心', 'pcie/hub-overview'],
  ['3181f64a-f1bd-81c2-9893-eea2b09219cf', 'PCIe 7.0 知识库', 'pcie/pcie7-knowledge'],
  ['3221f64a-f1bd-8171-8afb-f98425a3736c', 'PCIe TLP Byte Enable 规则', 'pcie/tlp-byte-enable'],
  ['3221f64a-f1bd-81d4-b34a-c1c49619b521', 'PCIe Completion TLP 规则', 'pcie/completion-tlp'],
  ['27f1f64a-f1bd-80fd-aae3-ec4e931ae977', 'PCIE', 'pcie/pcie-main']
];

var docsDir = path.join(__dirname, '..', 'docs');

async function main() {
  for (var idx = 0; idx < pages.length; idx++) {
    var pageId = pages[idx][0];
    var title = pages[idx][1];
    var outPath = pages[idx][2];
    process.stderr.write('Fetching: ' + title + '\n');
    try {
      var md = await toMarkdown(pageId, title);
      var outFile = path.join(docsDir, outPath + '.md');
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      fs.writeFileSync(outFile, md);
      process.stderr.write('  -> Saved: ' + outFile + ' (' + md.length + ' chars)\n');
    } catch(e) {
      process.stderr.write('  -> Error: ' + e.message + '\n');
    }
  }
  process.stderr.write('\nDone!\n');
}

main().catch(function(e) { console.error(e); process.exit(1); });
