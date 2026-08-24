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
      console.warn("Utilisation du stats.json existant.");
    }
  }

  // ==========================================
  // 1. ROCKET LEAGUE (API GRATUITE & DIRECTE)
  // ==========================================
  console.log("--> Récupération des rangs Rocket League...");
  try {
    const rlRes = await fetch('https://api.yannismate.de/rank/epic/abdel92jr');
    if (rlRes.ok) {
      const text = await rlRes.text();
      console.log("Réponse RL reçue :", text);

      // Exemple reçu : "Ranked Duel 1v1: Gold III Div III | Ranked Doubles 2v2: Platinum II Div I | Ranked Standard 3v3: Platinum II Div III"
      const segments = text.split('|');
      segments.forEach(seg => {
        const clean = seg.trim();
        if (clean.includes('1v1') || clean.includes('Duel')) {
          const parts = clean.split(':');
          if (parts[1]) currentStats.rocketLeague.duel1v1 = parts[1].trim();
        }
        if (clean.includes('2v2') || clean.includes('Doubles')) {
          const parts = clean.split(':');
          if (parts[1]) currentStats.rocketLeague.doubles2v2 = parts[1].trim();
        }
        if (clean.includes('3v3') || clean.includes('Standard')) {
          const parts = clean.split(':');
          if (parts[1]) currentStats.rocketLeague.standard3v3 = parts[1].trim();
        }
      });
      console.log("Nouveaux rangs RL enregistrés :", currentStats.rocketLeague);
    } else {
      console.warn("API RL temporairement indisponible.");
    }
  } catch (errRL) {
    console.error("Erreur récupération RL :", errRL.message);
  }

  // ==========================================
  // 2. VALORANT (API REST OFFICIELLE)
  // ==========================================
  console.log("--> Récupération des stats Valorant...");
  try {
    const valoRes = await fetch('https://vaccie.pythonanywhere.com/mmr/Abouu92jr/0213/eu');
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

  // Sauvegarde dans stats.json
  fs.writeFileSync(statsPath, JSON.stringify(currentStats, null, 2), 'utf8');
  console.log("--> stats.json mis à jour avec succès !");
}

fetchStats();
