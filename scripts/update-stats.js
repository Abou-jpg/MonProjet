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
      console.warn("Fichier stats.json initialisé avec les valeurs par défaut.");
    }
  }

  // ========================================================
  // 1. ROCKET LEAGUE : MÉTHODE 1 (API DIRECTE TRN)
  // ========================================================
  console.log(">>> [1/2] Tentative de récupération Rocket League...");
  let rlSuccess = false;

  try {
    const trnUrl = 'https://api.tracker.gg/api/v2/rocket-league/standard/profile/epic/abdel92jr';
    const trnRes = await fetch(trnUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (trnRes.ok) {
      const data = await trnRes.json();
      const segments = data?.data?.segments || [];

      segments.forEach(seg => {
        const modeName = seg.metadata?.name;
        const rankName = seg.stats?.tier?.metadata?.name;
        const divName = seg.stats?.division?.metadata?.name;

        if (modeName && rankName) {
          const fullRank = divName ? `${rankName} (${divName})` : rankName;
          if (modeName === 'Ranked Duel 1v1') currentStats.rocketLeague.duel1v1 = fullRank;
          if (modeName === 'Ranked Doubles 2v2') currentStats.rocketLeague.doubles2v2 = fullRank;
          if (modeName === 'Ranked Standard 3v3') currentStats.rocketLeague.standard3v3 = fullRank;
        }
      });
      console.log("RL récupéré avec succès via API Directe :", currentStats.rocketLeague);
      rlSuccess = true;
    }
  } catch (errApi) {
    console.warn("Échec API directe RL, passage au scraping Playwright...", errApi.message);
  }

  // ========================================================
  // 1. BIS : ROCKET LEAGUE (SCRAPING PLAYWRIGHT ANTI-BOT)
  // ========================================================
  if (!rlSuccess) {
    let browser;
    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      });

      const page = await context.newPage();
      await page.goto('https://rocketleague.tracker.network/rocket-league/profile/epic/abdel92jr/overview', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      await page.waitForTimeout(4000);

      const scraped = await page.evaluate(() => {
        const text = document.body.innerText;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const res = {};

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('Ranked Duel 1v1')) {
            res.duel1v1 = lines.slice(i, i + 6).find(l => /(Bronze|Silver|Gold|Platinum|Diam|Champ|Grand)/i.test(l));
          }
          if (lines[i].includes('Ranked Doubles 2v2')) {
            res.doubles2v2 = lines.slice(i, i + 6).find(l => /(Bronze|Silver|Gold|Platinum|Diam|Champ|Grand)/i.test(l));
          }
          if (lines[i].includes('Ranked Standard 3v3')) {
            res.standard3v3 = lines.slice(i, i + 6).find(l => /(Bronze|Silver|Gold|Platinum|Diam|Champ|Grand)/i.test(l));
          }
        }
        return res;
      });

      if (scraped.duel1v1) currentStats.rocketLeague.duel1v1 = scraped.duel1v1;
      if (scraped.doubles2v2) currentStats.rocketLeague.doubles2v2 = scraped.doubles2v2;
      if (scraped.standard3v3) currentStats.rocketLeague.standard3v3 = scraped.standard3v3;
      console.log("RL récupéré via Playwright :", scraped);
    } catch (errScrape) {
      console.error("Échec du scraping RL :", errScrape.message);
    } finally {
      if (browser) await browser.close();
    }
  }

  // ========================================================
  // 2. VALORANT (API REST OFFICIELLE)
  // ========================================================
  console.log(">>> [2/2] Récupération Valorant...");
  try {
    const valoRes = await fetch('https://vaccie.pythonanywhere.com/mmr/Abouu92jr/0213/eu');
    if (valoRes.ok) {
      const valoText = await valoRes.text();
      console.log("Réponse Valorant :", valoText);
      const parts = valoText.split(',');
      if (parts[0]) currentStats.valorant.rang = parts[0].trim();
      if (parts[1] && parts[1].includes('RR:')) {
        const matchRR = parts[1].match(/RR:\s*(\d+)/);
        if (matchRR) currentStats.valorant.rr = matchRR[1];
      }
    }
  } catch (errValo) {
    console.error("Erreur Valorant :", errValo.message);
  }

  // Sauvegarde
  fs.writeFileSync(statsPath, JSON.stringify(currentStats, null, 2), 'utf8');
  console.log(">>> Écriture de stats.json terminée avec succès !");
}

fetchStats();
