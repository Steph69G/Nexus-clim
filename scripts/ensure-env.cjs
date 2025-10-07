// scripts/ensure-env.cjs
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const envLocal = path.join(ROOT, ".env.local");
const envBackup = path.join(ROOT, ".env.local.backup");
const envSample = path.join(ROOT, ".env.sample");

function size(p) {
  try { return fs.statSync(p).size; } catch { return 0; }
}

function restore(from, to) {
  fs.copyFileSync(from, to);
  console.log(`✅ Restauré ${to} depuis ${from}`);
}

(function main() {
  const localSize = size(envLocal);

  // 1) Si .env.local existe mais est (quasi) vide → restaurer
  if (localSize > 0) {
    // Anti-troncature : si < 20 octets, on considère "vide"
    if (localSize < 20) {
      if (fs.existsSync(envBackup)) restore(envBackup, envLocal);
      else if (fs.existsSync(envSample)) restore(envSample, envLocal);
      else console.warn("⚠️ .env.local est vide et aucun backup/sample n'existe.");
    }
    return;
  }

  // 2) Si .env.local n'existe pas → créer depuis backup ou sample
  if (!fs.existsSync(envLocal)) {
    if (fs.existsSync(envBackup)) restore(envBackup, envLocal);
    else if (fs.existsSync(envSample)) restore(envSample, envLocal);
    else console.warn("⚠️ .env.local manquant et aucun backup/sample n'existe.");
  }
})();
