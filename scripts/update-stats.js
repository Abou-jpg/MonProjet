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
      const rankTiers = ['Bronze', 'Silver', 'Argent', 'Gold', 'Or', 'Platinum', 'Platine', 'Diamond', 'Diamant', 'Champion', 'Grand Champion', 'Supersonic Legend', 'Unranked', 'Non classé'];

      rows.forEach(r => {
        const fullText = (r.innerText || '').trim();
        const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);

        function parseRankForMode(modeKey) {
          let foundRank = null;
          let foundDiv = null;

          for (const line of lines) {
            for (const tier of rankTiers) {
              const reg = new RegExp(`^(${tier})(\\s+[I|V|X\\d]+)?`, 'i');
              if (reg.test(line)) {
                foundRank = line;
                break;
              }
            }
            if (/Division\s*[I|V|X\\d]+/i.test(line)) {
              foundDiv = line;
            }
          }

          if (foundRank) {
            res[modeKey] = foundDiv && !foundRank.includes(foundDiv) ? `${foundRank} (${foundDiv})` : foundRank;
          } else {
            const placementMatch = lines.find(l => /match/i.test(l));
            res[modeKey] = placementMatch ? `Non classé (${placementMatch})` : "Non classé";
          }
        }

        if (/Duel 1v1/i.test(fullText)) parseRankForMode('duel1v1');
        if (/Doubles 2v2/i.test(fullText)) parseRankForMode('doubles2v2');
        if (/Standard 3v3/i.test(fullText)) parseRankForMode('standard3v3');
      });

      return res;
    });

    console.log("=== RANGS FINAUX ===", scraped);

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
