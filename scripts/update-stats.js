const { chromium } = require('playwright');
const fs = require('fs');

async function scrapeRocketLeague() {
  console.log("Lancement du scraper...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
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

    await page.waitForTimeout(6000);

    const scraped = await page.evaluate(() => {
      const results = {};
      const rows = document.querySelectorAll('tr, .playlist-row');

      rows.forEach(r => {
        const text = r.innerText || '';
        const lines = text.split('\n').map(s => s.trim()).filter(Boolean);

        // Récupère le rang (généralement la 2e ou 3e ligne de texte de la rangée)
        if (text.includes('Duel 1v1') || text.includes('1v1')) {
          results.duel1v1 = lines.length > 1 ? (lines[1].toLowerCase().includes('duel') ? lines[2] : lines[1]) : text;
        }
        if (text.includes('Doubles 2v2') || text.includes('2v2')) {
          results.doubles2v2 = lines.length > 1 ? (lines[1].toLowerCase().includes('double') ? lines[2] : lines[1]) : text;
        }
        if (text.includes('Standard 3v3') || text.includes('3v3')) {
          results.standard3v3 = lines.length > 1 ? (lines[1].toLowerCase().includes('standard') ? lines[2] : lines[1]) : text;
        }
      });

      return results;
    });

    if (scraped.duel1v1) stats.rocketLeague.duel1v1 = scraped.duel1v1;
    if (scraped.doubles2v2) stats.rocketLeague.doubles2v2 = scraped.doubles2v2;
    if (scraped.standard3v3) stats.rocketLeague.standard3v3 = scraped.standard3v3;

    console.log("Stats extraites :", stats.rocketLeague);
  } catch (err) {
    console.log("Avertissement scraping :", err.message);
  } finally {
    fs.writeFileSync('stats.json', JSON.stringify(stats, null, 2));
    await browser.close();
  }
}

scrapeRocketLeague();
