const fs = require('fs');
const path = require('path');

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
  // 1. ROCKET LEAGUE (API STREAMER AVEC HEADERS)
  // ==========================================
  console.log("--> Récupération des rangs Rocket League...");
  try {
    const rlUrl = 'https://api.yannismate.de/rank/epic/abdel92jr';
    const rlRes = await fetch(rlUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/plain, */*'
      }
    });

    if (rlRes.ok) {
      const text = await rlRes.text();
      console.log("Réponse RL brute :", text);

      // Exemple reçu : "Ranked Duel 1v1: Gold III Div III | Ranked Doubles 2v2: Platinum II Div I | Ranked Standard 3v3: Platinum II Div III"
      const segments = text.split('|');
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
      console.log("Rangs RL mis à jour :", currentStats.rocketLeague);
    } else {
      console.warn(`API RL a répondu avec le statut ${rlRes.status}`);
    }
  } catch (errRL) {
    console.error("Erreur RL :", errRL.message);
  }

  // ==========================================
  // 2. VALORANT (API OFFICIELLE)
  // ==========================================
  console.log("--> Récupération des stats Valorant...");
  try {
    const valoRes = await fetch('https://vaccie.pythonanywhere.com/mmr/Abouu92jr/0213/eu', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    if (valoRes.ok) {
      const valoText = await valoRes.text();
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
  // 3. ENREGISTREMENT DANS STATS.JSON
  // ==========================================
  fs.writeFileSync(statsPath, JSON.stringify(currentStats, null, 2), 'utf8');
  console.log("--> stats.json mis à jour avec succès !");
}

fetchStats();
