const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').find(line => line.startsWith('GEMINI_API_KEY=')).split('=')[1];

async function run() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] })
  });
  const data = await res.json();
  console.log(data);
}
run();
