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
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log("Page chargée, attente du rendu des rangs...");
    await page.waitForTimeout(7000);

    const scraped = await page.evaluate(() => {
      const text = document.body.innerText;
      const res = {};

      function extractRank(modeRegex) {
        const regex = new RegExp(modeRegex + '[\\s\\S]{0,120}?(Bronze|Silver|Gold|Platinum|Diamond|Champion|Grand Champion|Supersonic Legend|Or|Platine|Diamant|Non classé|Unranked)\\s*([I|V|X\\d]+)?(?:[\\s\\S]{0,50}?(Division\\s*[I|V|X\\d]+))?', 'i');
        const match = text.match(regex);
        if (match) {
          const tier = match[1] || '';
          const num = match[2] || '';
          const div = match[3] || '';
          return `${tier} ${num} ${div ? '(' + div + ')' : ''}`.trim();
        }
        return null;
      }

      res.duel1v1 = extractRank('(?:Ranked\\s*)?Duel\\s*1v1');
      res.doubles2v2 = extractRank('(?:Ranked\\s*)?Doubles\\s*2v2');
      res.standard3v3 = extractRank('(?:Ranked\\s*)?Standard\\s*3v3');

      return res;
    });

    console.log("Rangs détectés :", scraped);

    if (scraped.duel1v1) stats.rocketLeague.duel1v1 = scraped.duel1v1;
    if (scraped.doubles2v2) stats.rocketLeague.doubles2v2 = scraped.doubles2v2;
    if (scraped.standard3v3) stats.rocketLeague.standard3v3 = scraped.standard3v3;

  } catch (err) {
    console.error("Erreur scraper :", err.message);
  } finally {
    fs.writeFileSync('stats.json', JSON.stringify(stats, null, 2));
    await browser.close();
    console.log("Fichier stats.json mis à jour !");
  }
}

scrapeRocketLeague();
