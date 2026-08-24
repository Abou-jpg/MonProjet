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
      console.warn("Utilisation des stats existantes en mémoire.");
    }
  }

  // --- 1. ROCKET LEAGUE (ANTI-DETECTION PLAYWRIGHT) ---
  console.log("--> Lancement Scraping Rocket League...");
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'fr-FR'
    });

    const page = await context.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    await page.goto('https://rocketleague.tracker.network/rocket-league/profile/epic/abdel92jr/overview', {
      waitUntil: 'networkidle',
      timeout: 45000
    });

    await page.waitForTimeout(3000);

    const rlData = await page.evaluate(() => {
      const ranks = {};
      const fullText = document.body.innerText;
      
      const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('Ranked Duel 1v1') || line === 'Ranked Duel 1v1') {
          for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
            if (/(Bronze|Silver|Gold|Platinum|Diam|Champ|Grand|Supersonic)\s+[I|V|X\d]+/i.test(lines[j])) {
              ranks.duel1v1 = lines[j];
              break;
            }
          }
        }
        if (line.includes('Ranked Doubles 2v2') || line === 'Ranked Doubles 2v2') {
          for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
            if (/(Bronze|Silver|Gold|Platinum|Diam|Champ|Grand|Supersonic)\s+[I|V|X\d]+/i.test(lines[j])) {
              ranks.doubles2v2 = lines[j];
              break;
            }
          }
        }
        if (line.includes('Ranked Standard 3v3') || line === 'Ranked Standard 3v3') {
          for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
            if (/(Bronze|Silver|Gold|Platinum|Diam|Champ|Grand|Supersonic)\s+[I|V|X\d]+/i.test(lines[j])) {
              ranks.standard3v3 = lines[j];
              break;
            }
          }
        }
      }
      return ranks;
    });

    if (rlData.duel1v1) currentStats.rocketLeague.duel1v1 = rlData.duel1v1;
    if (rlData.doubles2v2) currentStats.rocketLeague.doubles2v2 = rlData.doubles2v2;
    if (rlData.standard3v3) currentStats.rocketLeague.standard3v3 = rlData.standard3v3;
    console.log("Rangs RL extraits avec succès :", rlData);
  } catch (errRL) {
    console.error("Erreur RL :", errRL.message);
  } finally {
    if (browser) await browser.close();
  }

  // --- 2. VALORANT (API REST DIRECTE) ---
  console.log("--> Lancement Récupération Valorant...");
  try {
    const valoRes = await fetch('https://vaccie.pythonanywhere.com/mmr/Abouu92jr/0213/eu');
    if (valoRes.ok) {
      const valoText = await valoRes.text();
      console.log("Réponse API Valorant :", valoText);
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

  // --- 3. ÉCRITURE DANS STATS.JSON ---
  fs.writeFileSync(statsPath, JSON.stringify(currentStats, null, 2), 'utf8');
  console.log("Mise à jour de stats.json terminée !");
}

fetchStats();
