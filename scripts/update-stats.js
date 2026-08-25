const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function runCurl(url) {
  try {
    // -4 force l'IPv4 pour éviter le blocage réseau de GitHub Actions
    // -k ignore les erreurs de certificat SSL
    // -sL suit les redirections proprement
    const cmd = `curl -4 -sL -k --max-time 12 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" "${url}"`;
    const res = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    return res;
  } catch (err) {
    console.warn(`Erreur cURL sur ${url} :`, err.message);
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
      console.warn("Utilisation de la mémoire locale existante.");
    }
  }

  // ==========================================
  // 1. ROCKET LEAGUE (API MULTI-SERVEURS)
  // ==========================================
  console.log("--> [1/2] Récupération des rangs Rocket League...");
  
  const rlEndpoints = [
    'https://api.yannismate.de/rank/epic/abdel92jr',
    'http://api.yannismate.de/rank/epic/abdel92jr',
    'https://api.yannismate.de/rank/epic/abdel92jr?disable_div=false'
  ];

  let rlData = null;
  for (const url of rlEndpoints) {
    console.log(`Tentative sur : ${url}`);
    const out = runCurl(url);
    if (out && out.length > 5 && !out.includes('404') && !out.includes('error')) {
      rlData = out;
      break;
    }
  }

  if (rlData) {
    console.log("Réponse RL brute reçue :", rlData);
    const segments = rlData.split('|');
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
    console.log("Nouveaux rangs RL enregistrés :", currentStats.rocketLeague);
  } else {
    console.warn("Serveurs RL injoignables : conservation des rangs précédents.");
  }

  // ==========================================
  // 2. VALORANT (API OFFICIELLE)
  // ==========================================
  console.log("--> [2/2] Récupération des stats Valorant...");
  const valoText = runCurl('https://vaccie.pythonanywhere.com/mmr/Abouu92jr/0213/eu');
  if (valoText && !valoText.includes('error')) {
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
  console.log("--> stats.json synchronisé avec succès !");
}

fetchStats();
