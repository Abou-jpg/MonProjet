const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function fetchViaProxy(targetUrl) {
  try {
    // Passe par le proxy Jina pour contourner le bannissement IP de GitHub Actions
    const proxyUrl = `https://r.jina.ai/${targetUrl}`;
    const cmd = `curl -sL --max-time 20 -H "Accept: text/plain" "${proxyUrl}"`;
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (err) {
    return null;
  }
}

function fetchDirect(url) {
  try {
    const cmd = `curl -sL --max-time 10 -A "Mozilla/5.0" "${url}"`;
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (err) {
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
  // 1. ROCKET LEAGUE (VIA PASSERELLE ANTI-BLOCAGE)
  // ==========================================
  console.log("--> [1/2] Récupération des rangs Rocket League via passerelle...");

  let rlRaw = fetchViaProxy('https://api.yannismate.de/rank/epic/abdel92jr');

  if (!rlRaw || rlRaw.length < 5) {
    console.log("Tentative directe sans passerelle...");
    rlRaw = fetchDirect('https://api.yannismate.de/rank/epic/abdel92jr');
  }

  if (rlRaw) {
    console.log("Réponse RL brute reçue :", rlRaw);

    // Si la réponse vient de Jina, on nettoie le texte
    const cleanContent = rlRaw.replace(/Title:.*\n|URL Source:.*\n|Markdown Content:\n/g, '').trim();

    const segments = cleanContent.split('|');
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

    console.log("Rangs RL synchronisés :", currentStats.rocketLeague);
  } else {
    console.warn("API RL temporairement indisponible : conservation des rangs précédents.");
  }

  // ==========================================
  // 2. VALORANT (DIRECT)
  // ==========================================
  console.log("--> [2/2] Récupération des stats Valorant...");
  const valoText = fetchDirect('https://vaccie.pythonanywhere.com/mmr/Abouu92jr/0213/eu');
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
