const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function fetchViaJina(url) {
  try {
    const proxyUrl = `https://r.jina.ai/${url}`;
    const cmd = `curl -sL --max-time 25 -H "Accept: text/plain" -H "X-No-Cache: true" "${proxyUrl}"`;
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (err) {
    console.warn(`Erreur récupération sur ${url} :`, err.message);
    return null;
  }
}

function parseRanksFromText(text) {
  const results = {};
  if (!text) return results;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const rankRegex = /(Bronze|Silver|Gold|Platinum|Diamond|Champion|Grand Champion|Supersonic Legend)\s+([IVX\d]+)/i;
  const divRegex = /Division\s+([IVX\d]+)/i;

  function findRankAfter(index) {
    let rankFound = null;
    let divFound = null;
    for (let i = index + 1; i < Math.min(index + 12, lines.length); i++) {
      const line = lines[i];
      const match = line.match(rankRegex);
      if (match && !rankFound) {
        rankFound = `${match[1]} ${match[2]}`;
      }
      const divMatch = line.match(divRegex);
      if (divMatch && !divFound) {
        divFound = `Division ${divMatch[1]}`;
      }
      if (rankFound && divFound) break;
    }
    if (rankFound) {
      return divFound ? `${rankFound} (${divFound})` : rankFound;
    }
    return null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes('ranked duel 1v1') || line.includes('duel 1v1')) {
      const r = findRankAfter(i);
      if (r) results.duel1v1 = r;
    }
    if (line.includes('ranked doubles 2v2') || line.includes('doubles 2v2')) {
      const r = findRankAfter(i);
      if (r) results.doubles2v2 = r;
    }
    if (line.includes('ranked standard 3v3') || line.includes('standard 3v3')) {
      const r = findRankAfter(i);
      if (r) results.standard3v3 = r;
    }
  }

  return results;
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
      console.warn("Utilisation de la base existante.");
    }
  }

  // ==========================================
  // 1. ROCKET LEAGUE (TRACKER NETWORK DIRECT)
  // ==========================================
  console.log("--> [1/2] Lecture du profil Tracker Network Rocket League...");
  const rlOverviewUrl = 'https://rocketleague.tracker.network/rocket-league/profile/epic/abdel92jr/overview';
  const rlPageContent = fetchViaJina(rlOverviewUrl);

  if (rlPageContent && rlPageContent.length > 200) {
    console.log("Page Tracker Network récupérée avec succès ! Extraction des rangs...");
    const extracted = parseRanksFromText(rlPageContent);
    
    if (extracted.duel1v1) currentStats.rocketLeague.duel1v1 = extracted.duel1v1;
    if (extracted.doubles2v2) currentStats.rocketLeague.doubles2v2 = extracted.doubles2v2;
    if (extracted.standard3v3) currentStats.rocketLeague.standard3v3 = extracted.standard3v3;

    console.log("Vrais rangs Rocket League extraits :", currentStats.rocketLeague);
  } else {
    console.warn("Impossible de lire la page RL : conservation des rangs précédents.");
  }

  // ==========================================
  // 2. VALORANT (API OFFICIELLE)
  // ==========================================
  console.log("--> [2/2] Récupération des stats Valorant...");
  try {
    const valoCmd = `curl -sL --max-time 10 "https://vaccie.pythonanywhere.com/mmr/Abouu92jr/0213/eu"`;
    const valoText = execSync(valoCmd, { encoding: 'utf8' }).trim();
    if (valoText && !valoText.includes('error')) {
      console.log("Réponse Valorant :", valoText);
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
  // 3. SAUVEGARDE STATS.JSON
  // ==========================================
  fs.writeFileSync(statsPath, JSON.stringify(currentStats, null, 2), 'utf8');
  console.log("--> stats.json synchronisé avec succès !");
}

fetchStats();
