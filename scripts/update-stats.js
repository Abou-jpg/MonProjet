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
      const rows = Array.from(document.querySelectorAll('tr, .trn-table__row, .playlist'));

      const rankTiers = [
        'Supersonic Legend', 'Grand Champion III', 'Grand Champion II', 'Grand Champion I', 'Grand Champion',
        'Champion III', 'Champion II', 'Champion I', 'Champion',
        'Diamond III', 'Diamond II', 'Diamond I', 'Diamond', 'Diamant III', 'Diamant II', 'Diamant I', 'Diamant',
        'Platinum III', 'Platinum II', 'Platinum I', 'Platinum', 'Platine III', 'Platine II', 'Platine I', 'Platine',
        'Gold III', 'Gold II', 'Gold I', 'Gold', 'Or III', 'Or II', 'Or I', 'Or',
        'Silver III', 'Silver II', 'Silver I', 'Silver', 'Argent III', 'Argent II', 'Argent I', 'Argent',
        'Bronze III', 'Bronze II', 'Bronze I', 'Bronze', 'Unranked', 'Non classé'
      ];

      function extractFromRow(row, modeKey) {
        const text = row.innerText || '';
        
        // Recherche du palier exact dans tout le texte de la ligne
        const foundTier = rankTiers.find(tier => new RegExp(`\\b${tier}\\b`, 'i').test(text));
        
        // Recherche de la division
        const divMatch = text.match(/Division\s*([I|V|X\d]+)/i);
        const div = divMatch ? divMatch[0] : '';

        if (foundTier) {
          res[modeKey] = div && !foundTier.toLowerCase().includes('division') ? `${foundTier} (${div})` : foundTier;
        }
      }

      rows.forEach(r => {
        const rowText = r.innerText || '';
        if (/Ranked\s*Duel\s*1v1|Duel\s*1v1/i.test(rowText)) extractFromRow(r, 'duel1v1');
        if (/Ranked\s*Doubles\s*2v2|Doubles\s*2v2/i.test(rowText)) extractFromRow(r, 'doubles2v2');
        if (/Ranked\s*Standard\s*3v3|Standard\s*3v3/i.test(rowText)) extractFromRow(r, 'standard3v3');
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
