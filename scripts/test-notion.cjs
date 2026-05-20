const https = require('https');
const fs = require('fs');
const os = require('os');

const NOTION_KEY = fs.readFileSync(os.homedir() + '/.config/notion/api_key', 'utf8').trim();

function notionRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL('https://api.notion.com/v1' + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': 'Bearer ' + NOTION_KEY,
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
          console.error('Parse error:', e.message, rawData.substring(0, 200));
          reject(e);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  try {
    const data = await notionRequest('GET', '/blocks/31b1f64a-f1bd-815a-8b19-f5b4a44bb977/children?page_size=5');
    console.log('Success, got', data.results?.length, 'blocks');
    if (data.results) {
      data.results.forEach(b => console.log(' -', b.type, b.id));
    }
  } catch(e) {
    console.error('Error:', e.message);
  }
}

test();