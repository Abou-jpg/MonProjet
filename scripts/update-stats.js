const { chromium } = require('playwright');
const fs = require('fs');

async function scrapeRocketLeague() {
  console.log("Lancement du scraper...");
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  let stats = {
    rocketLeague: {
      duel1v1: "Non classé",
      doubles2v2: "Non classé",
      standard3v3: "Non classé",
      lastUpdated: new Date().toISOString()
    },
    valorant: {
      rank: "Bronze 3",
      rr: "38 RR",
      kd: "0.74",
      hs: "15.6%"
    }
  };

  try {
    await page.goto('https://rocketleague.tracker.network/rocket-league/profile/epic/abdel92jr/overview', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // Attente du rendu complet des scripts
    await page.waitForTimeout(8000);

    const pageTitle = await page.title();
    console.log("Titre de la page :", pageTitle);

    const results = await page.evaluate(() => {
      const text = document.body.innerText;
      const res = {};

      function extractRank(modePattern) {
        const regex = new RegExp(modePattern + '[\\s\\S]{0,150}?(Bronze|Silver|Gold|Platinum|Diamond|Champion|Grand Champion|Supersonic Legend|Unranked)\\s*([I|V|X]+)?(?:[\\s\\S]{0,50}?(Division\\s*[I|V|X]+))?', 'i');
        const match = text.match(regex);
        if (match) {
          const rankTier = match[1] || '';
          const rankNumber = match[2] || '';
          const division = match[3] || '';
          return `${rankTier} ${rankNumber} ${division ? '(' + division + ')' : ''}`.trim();
        }
        return null;
      }

      res.duel1v1 = extractRank('(?:Ranked\\s*)?Duel\\s*1v1');
      res.doubles2v2 = extractRank('(?:Ranked\\s*)?Doubles\\s*2v2');
      res.standard3v3 = extractRank('(?:Ranked\\s*)?Standard\\s*3v3');

      return res;
    });

    console.log("Rangs détectés :", results);

    if (results.duel1v1) stats.rocketLeague.duel1v1 = results.duel1v1;
    if (results.doubles2v2) stats.rocketLeague.doubles2v2 = results.doubles2v2;
    if (results.standard3v3) stats.rocketLeague.standard3v3 = results.standard3v3;

  } catch (err) {
    console.error("Erreur lors de l'exécution :", err.message);
  } finally {
    fs.writeFileSync('stats.json', JSON.stringify(stats, null, 2));
    await browser.close();
    console.log("stats.json enregistré avec succès !");
  }
}

scrapeRocketLeague();
