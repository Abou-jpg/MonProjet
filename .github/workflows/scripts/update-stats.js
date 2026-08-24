const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

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
      console.warn("Impossible de lire l'ancien stats.json, utilisation des valeurs par défaut.");
    }
  }

  // 1. Scraping Rocket League
  console.log("Démarrage Rocket League (Playwright)...");
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    await page.goto('https://rocketleague.tracker.network/rocket-league/profile/epic/abdel92jr/overview', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });

    await page.waitForTimeout(4000);

    const scrapedData = await page.evaluate(() => {
      const results = {};
      const rows = document.querySelectorAll('tr, .rank-row, .card-table tbody tr');
      rows.forEach(row => {
        const text = row.innerText;
        if (text.includes('Ranked Duel 1v1') || text.includes('Duel 1v1')) {
          const m = text.match(/(Bronze|Silver|Gold|Platinum|Diamond|Champion|Grand Champion|Supersonic Legend)\s+[I|V|X\d]+/i);
          if (m) results.duel1v1 = m[0];
        }
        if (text.includes('Ranked Doubles 2v2') || text.includes('Doubles 2v2')) {
          const m = text.match(/(Bronze|Silver|Gold|Platinum|Diamond|Champion|Grand Champion|Supersonic Legend)\s+[I|V|X\d]+/i);
          if (m) results.doubles2v2 = m[0];
        }
        if (text.includes('Ranked Standard 3v3') || text.includes('Standard 3v3')) {
          const m = text.match(/(Bronze|Silver|Gold|Platinum|Diamond|Champion|Grand Champion|Supersonic Legend)\s+[I|V|X\d]+/i);
          if (m) results.standard3v3 = m[0];
        }
      });
      return results;
    });

    if (scrapedData.duel1v1) currentStats.rocketLeague.duel1v1 = scrapedData.duel1v1;
    if (scrapedData.doubles2v2) currentStats.rocketLeague.doubles2v2 = scrapedData.doubles2v2;
    if (scrapedData.standard3v3) currentStats.rocketLeague.standard3v3 = scrapedData.standard3v3;
    console.log("Stats RL récupérées :", scrapedData);
  } catch (errRL) {
    console.error("Erreur Scraping RL :", errRL.message);
  } finally {
    if (browser) await browser.close();
  }

  // 2. API Valorant
  console.log("Démarrage Valorant...");
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

  // Sauvegarde
  fs.writeFileSync(statsPath, JSON.stringify(currentStats, null, 2), 'utf8');
  console.log("stats.json mis à jour !");
}

fetchStats();
