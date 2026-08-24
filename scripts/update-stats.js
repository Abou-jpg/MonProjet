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

  // 1. ROCKET LEAGUE (TRN API)
  const apiKey = process.env.TRN_API_KEY;
  if (apiKey) {
    try {
      const trnRes = await fetch('https://public-api.tracker.gg/v2/rocket-league/standard/profile/epic/abdel92jr', {
        headers: {
          'TRN-Api-Key': apiKey,
          'Accept': 'application/json'
        }
      });

      if (trnRes.ok) {
        const json = await trnRes.json();
        const segments = json?.data?.segments || [];

        segments.forEach(seg => {
          const mode = seg?.metadata?.name || '';
          const tier = seg?.stats?.tier?.metadata?.name || '';
          const div = seg?.stats?.division?.metadata?.name || '';
          const full = div ? `${tier} (${div})` : tier;

          if (mode.includes('Ranked Duel 1v1')) currentStats.rocketLeague.duel1v1 = full;
          if (mode.includes('Ranked Doubles 2v2')) currentStats.rocketLeague.doubles2v2 = full;
          if (mode.includes('Ranked Standard 3v3')) currentStats.rocketLeague.standard3v3 = full;
        });
        console.log("Stats RL mises à jour :", currentStats.rocketLeague);
      } else {
        console.warn(`API TRN code ${trnRes.status} : conservation des données.`);
      }
    } catch (e) {
      console.error("Erreur API RL :", e.message);
    }
  }

  // 2. VALORANT
  try {
    const valoRes = await fetch('https://vaccie.pythonanywhere.com/mmr/Abouu92jr/0213/eu');
    if (valoRes.ok) {
      const txt = await valoRes.text();
      const parts = txt.split(',');
      if (parts[0]) currentStats.valorant.rang = parts[0].trim();
      if (parts[1] && parts[1].includes('RR:')) {
        const m = parts[1].match(/RR:\s*(\d+)/);
        if (m) currentStats.valorant.rr = m[1];
      }
    }
  } catch (e) {
    console.error("Erreur Valorant :", e.message);
  }

  fs.writeFileSync(statsPath, JSON.stringify(currentStats, null, 2), 'utf8');
}

fetchStats();
