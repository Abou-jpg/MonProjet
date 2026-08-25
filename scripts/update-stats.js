const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function curlGet(url) {
  try {
    return execSync(`curl -sL --max-time 15 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" "${url}"`, { encoding: 'utf8' }).trim();
  } catch (e) {
    return null;
  }
}

async function fetchStats() {
  const statsPath = path.join(__dirname, '../stats.json');

  let currentStats = {
    rocketLeague: {
      duel1v1: "Gold III (Division III)",
      doubles2v2: "Platinum II (Division I)",
      standard3v3: "Platinum II (Division III)"
    },
    valorant: {
      rang: "Bronze 3",
      rr: "38",
      kd: "0.74",
      hs: "15.6%"
    }
  };

  if (fs.existsSync(statsPath)) {
    try {
      currentStats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    } catch (e) {
      console.warn("Utilisation de la mémoire par défaut.");
    }
  }

  // ==========================================
  // 1. ROCKET LEAGUE (cURL SYSTÈME DIRECT)
  // ==========================================
  console.log("--> Récupération des rangs Rocket League via cURL...");
  let rlText = curlGet('https://api.yannismate.de/rank/epic/abdel92jr');
  if (!rlText || rlText.length === 0 || rlText.includes('404')) {
    rlText = curlGet('http://api.yannismate.de/rank/epic/abdel92jr');
  }

  if (rlText) {
    console.log("Réponse RL brute :", rlText);
    const segments = rlText.split('|');
    segments.forEach(seg => {
      const clean = seg.trim();
      if (clean.toLowerCase().includes('1v1') || clean.toLowerCase().includes('duel')) {
        const parts = clean.split(':');
        if (parts[1]) currentStats.rocketLeague.duel1v1 = parts[1].trim();
      }
      if (clean.toLowerCase().includes('2v2') || clean.toLowerCase().includes('doubles')) {
        const parts = clean.split(':');
        if (parts[1]) currentStats.rocketLeague.doubles2v2 = parts[1].trim();
      }
      if (clean.toLowerCase().includes('3v3') || clean.toLowerCase().includes('standard')) {
        const parts = clean.split(':');
        if (parts[1]) currentStats.rocketLeague.standard3v3 = parts[1].trim();
      }
    });
    console.log("Rangs RL enregistrés :", currentStats.rocketLeague);
  } else {
    console.warn("Impossible de joindre l'API RL via cURL.");
  }

  // ==========================================
  // 2. VALORANT (cURL SYSTÈME DIRECT)
  // ==========================================
  console.log("--> Récupération des stats Valorant...");
  const valoText = curlGet('https://vaccie.pythonanywhere.com/mmr/Abouu92jr/0213/eu');
  if (valoText) {
    console.log("Réponse Valorant :", valoText);
    const parts = valoText.split(',');
    if (parts[0]) currentStats.valorant.rang = parts[0].trim();
    if (parts[1] && parts[1].includes('RR:')) {
      const rrMatch = parts[1].match(/RR:\s*(\d+)/);
      if (rrMatch) currentStats.valorant.rr = rrMatch[1];
    }
  }

  // ==========================================
  // 3. SAUVEGARDE STATS.JSON
  // ==========================================
  fs.writeFileSync(statsPath, JSON.stringify(currentStats, null, 2), 'utf8');
  console.log("--> stats.json mis à jour avec succès !");
}

fetchStats();
