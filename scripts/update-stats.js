const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright'); // Nécessaire pour Rocket League

async function fetchStats() {
  const statsPath = path.join(__dirname, '../stats.json');
  
  // 1. Initialisation des stats par défaut pour conserver les anciennes données
  let currentStats = {
    rocketLeague: {
      duel1v1: "Chargement...",
      doubles2v2: "Chargement...",
      standard3v3: "Chargement..."
    },
    valorant: {
      rang: "Bronze 3",
      rr: "38",
      kd: "0.74",
      hs: "15.6%"
    }
  };

  // Lecture de stats.json existant pour ne pas perdre les données si une API échoue
  if (fs.existsSync(statsPath)) {
    try {
      currentStats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    } catch (e) {
      console.warn("Impossible de lire l'ancien stats.json, utilisation des valeurs par défaut.");
    }
  }

  // ==========================================
  // PHASE 1 : Mise à jour Rocket League (Scraping)
  // ==========================================
  console.log("Démarrage de la récupération Rocket League (Playwright)...");
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    
    // Ton profil Epic : abdel92jr
    const url = 'https://rocketleague.tracker.network/rocket-league/profile/epic/abdel92jr/overview';
    await page.goto(url, { waitUntil: 'networkidle' });

    // Sélecteurs pour récupérer les rangs (Standard 3v3, Doubles 2v2, Duel 1v1)
    const modes = [
      { key: 'standard3v3', selector: '#main-container > div:nth-child(3) > div.col-lg-8 > div > div.card-body.p-0 > div:nth-child(1) > div.flex-row-center.rank-row > div.rank-value' },
      { key: 'doubles2v2', selector: '#main-container > div:nth-child(3) > div.col-lg-8 > div > div.card-body.p-0 > div:nth-child(2) > div.flex-row-center.rank-row > div.rank-value' },
      { key: 'duel1v1', selector: '#main-container > div:nth-child(3) > div.col-lg-8 > div > div.card-body.p-0 > div:nth-child(3) > div.flex-row-center.rank-row > div.rank-value' }
    ];

    for (const mode of modes) {
      try {
        const rankElement = await page.waitForSelector(mode.selector, { timeout: 15000 });
        if (rankElement) {
          const rankText = await rankElement.innerText();
          if (rankText && rankText.trim().length > 2) {
            currentStats.rocketLeague[mode.key] = rankText.trim();
            console.log(`Rocket League ${mode.key} récupéré : ${rankText.trim()}`);
          }
        }
      } catch (errMode) {
        console.warn(`Impossible de récupérer le rang pour ${mode.key} : ${errMode.message}`);
      }
    }
  } catch (errRL) {
    console.error("Erreur globale lors du récupération Rocket League :", errRL.message);
  } finally {
    if (browser) await browser.close();
  }

  // ==========================================
  // PHASE 2 : Mise à jour Valorant (API simple)
  // ==========================================
  console.log("Démarrage de la récupération Valorant...");
  try {
    // Ton ID Valorant : Abouu92jr#0213
    const valoRes = await fetch('https://vaccie.pythonanywhere.com/mmr/Abouu92jr/0213/eu');
    if (valoRes.ok) {
      const valoText = await valoRes.text(); // Format "Bronze 3, RR: 38"
      console.log("Réponse Valorant :", valoText);
      const parts = valoText.split(',');
      if (parts[0]) currentStats.valorant.rang = parts[0].trim();
      if (parts[1] && parts[1].includes('RR:')) {
        const rrMatch = parts[1].match(/RR:\s*(\d+)/);
        if (rrMatch) currentStats.valorant.rr = rrMatch[1];
      }
    } else {
      console.warn("API Valorant indisponible, conservation des anciennes valeurs.");
    }
  } catch (errValo) {
    console.error("Erreur lors du récupération Valorant :", errValo.message);
  }

  // 2. Écriture finale du fichier stats.json à la racine
  fs.writeFileSync(statsPath, JSON.stringify(currentStats, null, 2), 'utf8');
  console.log("Fichier stats.json mis à jour avec succès à la racine !");
}

fetchStats();
