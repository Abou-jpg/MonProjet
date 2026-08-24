const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

chromium.use(stealth);

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
      console.warn("Initialisation du fichier stats.json.");
    }
  }

  // ==========================================
  // 1. ROCKET LEAGUE (Scraping Furtif Automatisé)
  // ==========================================
  console.log("--> [1/2] Lancement de l'extraction Rocket League...");
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'fr-FR',
      timezoneId: 'Europe/Paris'
    });

    const page = await context.newPage();
    const targetUrl = 'https://rocketleague.tracker.network/rocket-league/profile/epic/abdel92jr/overview';
    
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await page.waitForTimeout(5000); // Laisse le temps aux composants dynamiques de charger

    const extractedRanks = await page.evaluate(() => {
      const results = {};
      const fullText = document.body.innerText;
      const lines = fullText.split('\n').map(s => s.trim()).filter(Boolean);

      const rankRegex = /(Bronze|Silver|Gold|Platinum|Diamond|Champion|Grand Champion|Supersonic Legend)\s+[I|V|X\d]+(\s*\(Division\s*[I|V|X\d]+\))?/i;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Duel 1v1
        if (line.includes('Ranked Duel 1v1') || line === 'Ranked Duel 1v1') {
          for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
            if (rankRegex.test(lines[j])) {
              results.duel1v1 = lines[j];
              break;
            }
          }
        }

        // Doubles 2v2
        if (line.includes('Ranked Doubles 2v2') || line === 'Ranked Doubles 2v2') {
          for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
            if (rankRegex.test(lines[j])) {
              results.doubles2v2 = lines[j];
              break;
            }
          }
        }

        // Standard 3v3
        if (line.includes('Ranked Standard 3v3') || line === 'Ranked Standard 3v3') {
          for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
            if (rankRegex.test(lines[j])) {
              results.standard3v3 = lines[j];
              break;
            }
          }
        }
      }
      return results;
    });

    if (extractedRanks.duel1v1) currentStats.rocketLeague.duel1v1 = extractedRanks.duel1v1;
    if (extractedRanks.doubles2v2) currentStats.rocketLeague.doubles2v2 = extractedRanks.doubles2v2;
    if (extractedRanks.standard3v3) currentStats.rocketLeague.standard3v3 = extractedRanks.standard3v3;

    console.log("Rangs Rocket League extraits :", extractedRanks);
  } catch (errRL) {
    console.error("Erreur d'extraction Rocket League :", errRL.message);
  } finally {
    if (browser) await browser.close();
  }

  // ==========================================
  // 2. VALORANT (API Automatisée)
  // ==========================================
  console.log("--> [2/2] Lancement de l'extraction Valorant...");
  try {
    const valoRes = await fetch('https://vaccie.pythonanywhere.com/mmr/Abouu92jr/0213/eu');
    if (valoRes.ok) {
      const valoText = await valoRes.text();
      const parts = valoText.split(',');
      if (parts[0]) currentStats.valorant.rang = parts[0].trim();
      if (parts[1] && parts[1].includes('RR:')) {
        const rrMatch = parts[1].match(/RR:\s*(\d+)/);
        if (rrMatch) currentStats.valorant.rr = rrMatch[1];
      }
      console.log("Valorant mis à jour :", currentStats.valorant);
    }
  } catch (errValo) {
    console.error("Erreur Valorant :", errValo.message);
  }

  // ==========================================
  // 3. SAUVEGARDE DANS STATS.JSON
  // ==========================================
  fs.writeFileSync(statsPath, JSON.stringify(currentStats, null, 2), 'utf8');
  console.log("--> Fichier stats.json synchronisé avec succès !");
}

fetchStats();
