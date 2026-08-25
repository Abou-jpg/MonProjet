const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function fetchViaJina(url) {
  try {
    const proxyUrl = `https://r.jina.ai/${url}?_t=${Date.now()}`;
    const cmd = `curl -sL --max-time 30 -H "Accept: application/json, text/plain, */*" "${proxyUrl}"`;
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (err) {
    console.warn(`Erreur sur ${url} :`, err.message);
    return null;
  }
}

function parseTRNJson(rawText) {
  if (!rawText) return null;
  try {
    const startIdx = rawText.indexOf('{');
    const endIdx = rawText.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1) return null;

    const jsonStr = rawText.substring(startIdx, endIdx + 1);
    const parsed = JSON.parse(jsonStr);
    const segments = parsed?.data?.segments || [];
    const results = {};

    segments.forEach(seg => {
      const modeName = seg?.metadata?.name || '';
      const tierName = seg?.stats?.tier?.metadata?.name;
      const divName = seg?.stats?.division?.metadata?.name;

      if (tierName) {
        const fullRank = divName ? `${tierName} (${divName})` : tierName;
        if (modeName.includes('Duel 1v1')) results.duel1v1 = fullRank;
        if (modeName.includes('Doubles 2v2')) results.doubles2v2 = fullRank;
        if (modeName.includes('Standard 3v3')) results.standard3v3 = fullRank;
      }
    });

    return Object.keys(results).length > 0 ? results : null;
  } catch (e) {
    return null;
  }
}

function parseTRNMarkdown(rawText) {
  if (!rawText) return {};
  const results = {};
  const modes = [
    { key: 'duel1v1', match: /Ranked\s+Duel\s+1v1/i },
    { key: 'doubles2v2', match: /Ranked\s+Doubles\s+2v2/i },
    { key: 'standard3v3', match: /Ranked\s+Standard\s+3v3/i }
  ];

  modes.forEach(m => {
    const found = rawText.search(m.match);
    if (found !== -1) {
      const block = rawText.slice(found, found + 800);
      const tierMatch = block.match(/\b(Bronze|Silver|Gold|Platinum|Diamond|Champion|Grand Champion|Supersonic Legend)\s+([IVX\d]+)/i);
      const divMatch = block.match(/Division\s+([IVX\d]+)/i);
      if (tierMatch) {
        const tier = `${tierMatch[1]} ${tierMatch[2]}`;
        results[m.key] = divMatch ? `${tier} (Division ${divMatch[1]})` : tier;
      }
    }
  });

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
  // 1. ROCKET LEAGUE (TRACKER NETWORK LIVE)
  // ==========================================
  console.log("--> [1/2] Récupération directe Tracker Network pour abdel92jr...");
  
  // 1ère méthode : API Tracker Network
  const apiRaw = fetchViaJina('https://api.tracker.gg/api/v2/rocket-league/standard/profile/epic/abdel92jr');
  let extractedRL = parseTRNJson(apiRaw);

  // 2ème méthode de secours : Page Overview Tracker Network
  if (!extractedRL) {
    console.log("Lecture du profil web overview...");
    const webRaw = fetchViaJina('https://rocketleague.tracker.network/rocket-league/profile/epic/abdel92jr/overview');
    extractedRL = parseTRNMarkdown(webRaw);
  }

  if (extractedRL && Object.keys(extractedRL).length > 0) {
    console.log("Vrais rangs récupérés depuis Tracker Network :", extractedRL);
    if (extractedRL.duel1v1) currentStats.rocketLeague.duel1v1 = extractedRL.duel1v1;
    if (extractedRL.doubles2v2) currentStats.rocketLeague.doubles2v2 = extractedRL.doubles2v2;
    if (extractedRL.standard3v3) currentStats.rocketLeague.standard3v3 = extractedRL.standard3v3;
  } else {
    console.warn("Données RL non reçues : conservation des rangs existants.");
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
  // 3. SAUVEGARDE STATS.JSON
  // ==========================================
  fs.writeFileSync(statsPath, JSON.stringify(currentStats, null, 2), 'utf8');
  console.log("--> stats.json mis à jour :", currentStats);
}

fetchStats();
