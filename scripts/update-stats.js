const { chromium } = require('playwright');
const fs = require('fs');

async function scrapeRocketLeague() {
  console.log("Lancement du scraper...");
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
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

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

    await page.waitForTimeout(8000);

    const scraped = await page.evaluate(() => {
      const res = {};
      const rows = document.querySelectorAll('tr, .trn-table__row, .playlist');

      rows.forEach(r => {
        const fullText = (r.innerText || '').trim();
        const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);

        function parseRow(modeKey) {
          // Retire les lignes contenant le nom du mode
          const cleanLines = lines.filter(l => !/ranked|duel|doubles|standard|1v1|2v2|3v3/i.test(l));
          if (cleanLines.length > 0) {
            let rank = cleanLines[0];
            if (cleanLines[1] && /division/i.test(cleanLines[1])) {
              rank += ` (${cleanLines[1]})`;
            }
            res[modeKey] = rank;
          }
        }

        if (/Duel 1v1/i.test(fullText)) parseRow('duel1v1');
        if (/Doubles 2v2/i.test(fullText)) parseRow('doubles2v2');
        if (/Standard 3v3/i.test(fullText)) parseRow('standard3v3');
      });

      return res;
    });

    console.log("=== VRAIS RANGS EXTRAITS ===", scraped);

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
