// sync.js — put this in your BOT project root
import { execSync } from 'child_process';
try {
  execSync('git pull origin main --force', { stdio: 'inherit' });
  console.log("EMPIRE SESSIONS SYNCED FROM GITHUB — ALL SOLDIERS SAFE");
} catch (e) {
  console.log("Sync failed (normal on first run):", e.message);
}