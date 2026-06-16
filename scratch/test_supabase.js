import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '../data/crm_config.json');

async function testFetch() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('Config file not found at:', CONFIG_PATH);
    return;
  }
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  console.log('Connecting to:', cfg.supabaseUrl);
  
  const headers = { 
    apikey: cfg.supabaseAnonKey, 
    'Content-Type': 'application/json' 
  };
  if (cfg.supabaseAnonKey.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${cfg.supabaseAnonKey}`;
  }

  try {
    const res = await fetch(
      `${cfg.supabaseUrl}/rest/v1/crm_store?id=eq.main&select=job_applications,projects,companies`,
      { headers }
    );
    console.log('Status:', res.status);
    const body = await res.text();
    console.log('Response body:', body);
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testFetch();
