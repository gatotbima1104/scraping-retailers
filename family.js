import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as XLSX from "xlsx";
import path from 'path'

puppeteerExtra.use(StealthPlugin());

import { fileURLToPath } from 'url';
import { executablePath } from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


(async () => {
  try {
    const browser = await puppeteerExtra.launch({
      headless: false,
      executablePath: executablePath()
    });

    const url = "https://www.familydollar.com/searchresults?Ntt=food%20storage";

    const page = await browser.newPage();
    await page.goto(url);

      await page.waitForTimeout(5000);

      const data = [];
      // const subCategory = link.text; // Use the subCategory from allLinks

      const scrapeCurrentPage = async () => {
        // Wait for the updated prices to load (you may need to adjust the selector and wait time)
        // await page.waitForSelector(".ym-grid ym-clearfix");

        // Extract the data from the current page
        const pageData = await page.evaluate(() => {
          const productElements = Array.from(
            document.querySelectorAll(".product-wrapper")
          );

          return productElements.map((product) => {
            const linkElement = product.querySelector("a.search-product-link");
            const titleElement = product.querySelector('span[data-bind="html: displayName"]');
            const priceElement = product.querySelector("span.list-price-text");

            // Check if the link, title, and price elements exist before accessing their properties
            const link = linkElement ? linkElement.href : "";
            const title = titleElement
              ? titleElement.textContent.trim().replace(/\n/g, " ")
              : "";
            const price = priceElement
              ? priceElement.textContent.trim().replace(/\n/g, " ")
              : "";

            // Check if the image element exists before accessing its 'src' property
            const imageElement = product.querySelector("div#cc_img__resize_wrapper img");
            const image = imageElement ? imageElement.src : "";

            return { link, title, price, image };
          });
        });

        data.push(...pageData);
      };

      await scrapeCurrentPage();
      // console.log(data)

      // Specify the output path for the Excel file inside the 'coffe' directory
      const outputDirectory = "./"; // Relative path to the 'coffe' directory
      const outputFilePath = path.join(__dirname, outputDirectory, "article-family.xlsx");

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, outputFilePath);

      await page.close(); // Close the page after you're done with i

    await browser.close();
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();