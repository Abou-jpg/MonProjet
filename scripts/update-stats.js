const fs = require('fs');
const path = require('path');

async function fetchStats() {
  const statsPath = path.join(__dirname, '../stats.json');
  
  // Lecture des stats existantes pour conserver les données en cas d'échec d'une API
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
      console.warn("Impossible de lire l'ancien stats.json, initialisation par défaut.");
    }
  }

  // 1. Mise à jour Valorant (Abouu92jr#0213 • Serveur EU)
  try {
    console.log("Récupération des stats Valorant...");
    const valoRes = await fetch('https://vaccie.pythonanywhere.com/mmr/Abouu92jr/0213/eu');
    
    if (valoRes.ok) {
      const valoText = await valoRes.text(); // Format retourné : "Bronze 3, RR: 38"
      console.log("Réponse Valorant :", valoText);
      
      // Extraction du rang et des RR
      const parts = valoText.split(',');
      if (parts[0]) {
        currentStats.valorant.rang = parts[0].trim();
      }
      if (parts[1] && parts[1].includes('RR:')) {
        const rrMatch = parts[1].match(/RR:\s*(\d+)/);
        if (rrMatch) currentStats.valorant.rr = rrMatch[1];
      }
    } else {
      console.warn("API Valorant indisponible, conservation des stats précédentes.");
    }
  } catch (err) {
    console.error("Erreur lors de la récupération Valorant :", err.message);
  }

  // 2. Écriture du fichier stats.json à la racine
  fs.writeFileSync(statsPath, JSON.stringify(currentStats, null, 2), 'utf8');
  console.log("stats.json mis à jour avec succès !");
}

fetchStats();
