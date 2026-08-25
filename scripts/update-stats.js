const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function fetchViaJina(url) {
  try {
    const targetWithBuster = url.includes('?') ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
    const proxyUrl = `https://r.jina.ai/${targetWithBuster}`;
    const cmd = `curl -sL --max-time 30 -H "Accept: text/plain" -H "X-No-Cache: true" "${proxyUrl}"`;
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (err) {
    console.warn(`Erreur récupération sur ${url} :`, err.message);
    return null;
  }
}

function extractRankFromChunk(text, modeRegex) {
  const match = text.match(modeRegex);
  if (!match) return null;

  // Récupère les 600 caractères suivant immédiatement le titre du mode
  const startIndex = match.index;
  const chunk = text.slice(startIndex, startIndex + 600);

  const rankMatch = chunk.match(/\b(Bronze|Silver|Gold|Platinum|Diamond|Champion|Grand Champion|Supersonic Legend)\s+([IVX\d]+)/i);
  const divMatch = chunk.match(/Division\s+([IVX\d]+)/i);

  if (rankMatch) {
    const tierName = rankMatch[1].charAt(0).toUpperCase() + rankMatch[1].slice(1).toLowerCase();
    const tierLevel = rankMatch[2].toUpperCase();
    const rank = `${tierName} ${tierLevel}`;
    const div = divMatch ? `Division ${divMatch[1].toUpperCase()}` : null;
    return div ? `${rank} (${div})` : rank;
  }
  return null;
}

async function fetchStats() {
  const statsPath = path.join(__dirname, '../stats.json');

  let currentStats = {
    rocketLeague: {
      duel1v1: "Non Classé",
      doubles2v2: "Non Classé",
      standard3v3: "Non Classé"
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
  // 1. ROCKET LEAGUE (TRACKER NETWORK)
  // ==========================================
  console.log("--> [1/2] Récupération Tracker Network Rocket League...");
  const rlUrl = 'https://rocketleague.tracker.network/rocket-league/profile/epic/abdel92jr/overview';
  const rawPage = fetchViaJina(rlUrl);

  if (rawPage && rawPage.length > 200) {
    console.log("Page reçue avec succès (" + rawPage.length + " caractères). Extraction...");

    const r1v1 = extractRankFromChunk(rawPage, /Ranked\s+Duel\s+1v1|Duel\s+1v1/i);
    const r2v2 = extractRankFromChunk(rawPage, /Ranked\s+Doubles\s+2v2|Doubles\s+2v2/i);
    const r3v3 = extractRankFromChunk(rawPage, /Ranked\s+Standard\s+3v3|Standard\s+3v3/i);

    console.log("Extraction brute :", { r1v1, r2v2, r3v3 });

    if (r1v1) currentStats.rocketLeague.duel1v1 = r1v1;
    if (r2v2) currentStats.rocketLeague.doubles2v2 = r2v2;
    if (r3v3) currentStats.rocketLeague.standard3v3 = r3v3;

    console.log("Rangs Rocket League enregistrés :", currentStats.rocketLeague);
  } else {
    console.warn("Page RL non accessible.");
  }

  // ==========================================
  // 2. VALORANT
  // ==========================================
  console.log("--> [2/2] Récupération Valorant...");
  try {
    const valoCmd = `curl -sL --max-time 10 "https://vaccie.pythonanywhere.com/mmr/Abouu92jr/0213/eu"`;
    const valoText = execSync(valoCmd, { encoding: 'utf8' }).trim();
    if (valoText && !valoText.includes('error')) {
      const parts = valoText.split(',');
      if (parts[0]) currentStats.valorant.rang = parts[0].trim();
      if (parts[1] && parts[1].includes('RR:')) {
        const rrMatch = parts[1].match(/RR:\s*(\d+)/);
        if (rrMatch) currentStats.valorant.rr = rrMatch[1];
      }
    }
  } catch (errValo) {
    console.error("Erreur Valorant :", errValo.message);
  }

  // ==========================================
  // 3. SAUVEGARDE
  // ==========================================
  fs.writeFileSync(statsPath, JSON.stringify(currentStats, null, 2), 'utf8');
  console.log("--> stats.json synchronisé avec succès !");
}

fetchStats();
