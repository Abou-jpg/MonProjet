const { chromium } = require('playwright');
const fs = require('fs');

async function scrapeRocketLeague() {
  console.log("Lancement du scraper anti-détection...");
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080'
    ]
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    extraHTTPHeaders: {
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
    }
  });

  const page = await context.newPage();

  // Masquer l'empreinte d'automatisation
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

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
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });

    await page.waitForTimeout(10000);

    const title = await page.title();
    console.log("=== TITRE DE LA PAGE ===", title);

    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log("=== EXTRAIT DU CONTENU ===");
    console.log(bodyText.substring(0, 400));
    console.log("==========================");

    const scraped = await page.evaluate(() => {
      const res = {};
      const rows = document.querySelectorAll('tr, .trn-table__row, .playlist');
      
      rows.forEach(r => {
        const t = r.innerText || '';
        const lines = t.split('\n').map(l => l.trim()).filter(Boolean);

        if (/Ranked Duel 1v1|Duel 1v1/i.test(t)) {
          res.duel1v1 = lines.length > 1 ? lines[1] : t;
        }
        if (/Ranked Doubles 2v2|Doubles 2v2/i.test(t)) {
          res.doubles2v2 = lines.length > 1 ? lines[1] : t;
        }
        if (/Ranked Standard 3v3|Standard 3v3/i.test(t)) {
          res.standard3v3 = lines.length > 1 ? lines[1] : t;
        }
      });
      return res;
    });

    console.log("=== STATS EXTRAITES ===", scraped);

    if (scraped.duel1v1) stats.rocketLeague.duel1v1 = scraped.duel1v1;
    if (scraped.doubles2v2) stats.rocketLeague.doubles2v2 = scraped.doubles2v2;
    if (scraped.standard3v3) stats.rocketLeague.standard3v3 = scraped.standard3v3;

  } catch (err) {
    console.error("Erreur scraper :", err.message);
  } finally {
    fs.writeFileSync('stats.json', JSON.stringify(stats, null, 2));
    await browser.close();
  }
}

scrapeRocketLeague();
