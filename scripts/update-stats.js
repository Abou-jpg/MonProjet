const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function fetchViaJina(url) {
  try {
    // Horodatage dynamique anti-cache pour forcer les données à la seconde près
    const cacheBuster = `nocache_${Date.now()}`;
    const targetWithBuster = url.includes('?') ? `${url}&_t=${cacheBuster}` : `${url}?_t=${cacheBuster}`;
    const proxyUrl = `https://r.jina.ai/${targetWithBuster}`;

    const cmd = `curl -sL --max-time 25 -H "Accept: text/plain" -H "X-No-Cache: true" "${proxyUrl}"`;
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (err) {
    console.warn(`Erreur lors de la récupération sur ${url} :`, err.message);
    return null;
  }
}

function parseCurrentRanks(text) {
  const results = {};
  if (!text) return results;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const rankRegex = /(Bronze|Silver|Gold|Platinum|Diamond|Champion|Grand Champion|Supersonic Legend)\s+([IVX\d]+)/i;
  const divRegex = /Division\s+([IVX\d]+)/i;

  function findFirstRankAfter(index) {
    let rankFound = null;
    let divFound = null;

    for (let i = index + 1; i < Math.min(index + 10, lines.length); i++) {
      const line = lines[i];

      // Évite de déborder sur le mode suivant
      if (line.toLowerCase().includes('ranked') || line.toLowerCase().includes('un-ranked')) {
        break;
      }

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

  // Ne prend QUE la première occurrence (la saison active en haut de page)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();

    if ((line.includes('ranked duel 1v1') || line.includes('duel 1v1')) && !results.duel1v1) {
      const r = findFirstRankAfter(i);
      if (r) results.duel1v1 = r;
    }

    if ((line.includes('ranked doubles 2v2') || line.includes('doubles 2v2')) && !results.doubles2v2) {
      const r = findFirstRankAfter(i);
      if (r) results.doubles2v2 = r;
    }

    if ((line.includes('ranked standard 3v3') || line.includes('standard 3v3')) && !results.standard3v3) {
      const r = findFirstRankAfter(i);
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
  // 1. ROCKET LEAGUE (TRACKER NETWORK TEMPS RÉEL)
  // ==========================================
  console.log("--> [1/2] Lecture temps réel du profil Tracker Network Rocket League...");
  const rlOverviewUrl = 'https://rocketleague.tracker.network/rocket-league/profile/epic/abdel92jr/overview';
  const rlPageContent = fetchViaJina(rlOverviewUrl);

  if (rlPageContent && rlPageContent.length > 200) {
    const extracted = parseCurrentRanks(rlPageContent);
    console.log("Données actuelles extraites :", extracted);

    if (extracted.duel1v1) currentStats.rocketLeague.duel1v1 = extracted.duel1v1;
    if (extracted.doubles2v2) currentStats.rocketLeague.doubles2v2 = extracted.doubles2v2;
    if (extracted.standard3v3) currentStats.rocketLeague.standard3v3 = extracted.standard3v3;

    console.log("Rangs Rocket League mis à jour :", currentStats.rocketLeague);
  } else {
    console.warn("Page RL inaccessible : conservation des données précédentes.");
  }

  // ==========================================
  // 2. VALORANT
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
  // 3. SAUVEGARDE DANS STATS.JSON
  // ==========================================
  fs.writeFileSync(statsPath, JSON.stringify(currentStats, null, 2), 'utf8');
  console.log("--> stats.json synchronisé avec succès !");
}

fetchStats();
