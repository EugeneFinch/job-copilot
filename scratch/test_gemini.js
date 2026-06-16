import fs from 'fs';

const settings = JSON.parse(fs.readFileSync('data/settings.json', 'utf8'));
const key = settings.geminiApiKey;

async function test(model) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Say hello!" }] }]
      })
    });
    console.log(`Model: ${model} | Status: ${res.status}`);
    if (!res.ok) {
      console.log(await res.text());
    } else {
      const data = await res.json();
      console.log(data?.candidates?.[0]?.content?.parts?.[0]?.text);
    }
  } catch (e) {
    console.error(`${model} failed:`, e.message);
  }
}

console.log("Testing Gemini models with key:", key.substring(0, 10) + "...");
await test('gemini-1.5-pro');
await test('gemini-1.5-pro-latest');
await test('gemini-1.5-flash');
await test('gemini-2.5-flash');
await test('gemini-2.0-flash');
