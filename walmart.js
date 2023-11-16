import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import path from "path";
import * as XLSX from "xlsx";
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker'

puppeteerExtra.use(StealthPlugin());
puppeteerExtra.use(AdblockerPlugin({ blockTrackers: true }))

import { fileURLToPath } from "url";
import { executablePath } from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  try {
    const browser = await puppeteerExtra.launch({
      headless: true,
      executablePath: executablePath(),
      args: ["--disable-setuid-sandbox"],
	        'ignoreHTTPSErrors': true
      // args: [`--proxy-server=138.199.48.1:8443`]
    });
    
    const url =
    // "https://www.walmart.com/search?q=+food+storage&facet=brand%3AGreat+Value%7C%7Cbrand%3AMainstays";
    "https://grocery.walmart.com/"
    // "https://bot.sannysoft.com/"
    
    const page = await browser.newPage();
    await page.goto(url);

    // await page.screenshot({path: 'bot.png'})

    await page.waitForTimeout(5000);

    await page.screenshot({path: 'bot.png'})

    await browser.close()
    const data = [];

    const scrapeCurrentPage = async () => {
      const pageData = await page.evaluate(() => {
        const productElements = Array.from(
          document.querySelectorAll("div.mb0")
        );

        return productElements
          .map((product) => {
            const linkElement = product.querySelector("a");
            const titleElement = product.querySelector(
              'span[data-automation-id="product-title"]'
            );
            const priceElement = product.querySelector("div.mr1");

            const link = linkElement ? linkElement.href : "";
            const title = titleElement
              ? titleElement.textContent.trim().replace(/\n/g, " ")
              : "";
            const priceText = priceElement
              ? priceElement.textContent.trim().replace(/\n/g, " ")
              : "";

            if (link && title && priceText) {
              const price = parseFloat(priceText.replace("$", "")) / 100;
              const imageElement = product.querySelector("img");
              const image = imageElement ? imageElement.src : "";

              return { link, title, price, image };
            } else {
              return null; // Return null for products without valid data
            }
          })
          .filter((product) => product !== null); // Filter out null values
      });

      data.push(...pageData);
    };

    await scrapeCurrentPage();

    // console.log(data);

    // Commented out code for generating Excel file, as you are logging data for debugging
    // Specify the output path for the Excel file inside the 'coffe' directory
    const outputDirectory = "./food-storage"; // Relative path to the 'coffe' directory
    const outputFilePath = path.join(
      __dirname,
      outputDirectory,
      "walmart.xlsx"
    );

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, outputFilePath);

    await page.close();
    await browser.close();
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();
