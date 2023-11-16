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

    const url = "https://ftlkits.com/collections/all";

    const page = await browser.newPage();
    await page.goto(url);

      await page.waitForTimeout(5000);
      // await page.waitForNavigation()

      const data = [];
      // const subCategory = link.text; // Use the subCategory from allLinks

      const scrapeCurrentPage = async () => {
        await page.evaluate(async () => {
          await new Promise((resolve, reject) => {
              let totalHeight = 0;
              const distance = 100; // Scroll distance
              const scrollInterval = setInterval(() => {
                  const scrollHeight = document.body.scrollHeight;
                  window.scrollBy(0, distance);
                  totalHeight += distance;

                  if (totalHeight >= scrollHeight) {
                      clearInterval(scrollInterval);
                      resolve();
                  }
              }, 100); // Scroll interval in milliseconds
          });
      });

        // Extract the data from the current page
        const pageData = await page.evaluate(() => {
          const productElements = Array.from(
            document.querySelectorAll("div.grid-item")
          );

          return productElements.map((product) => {
            // const linkElement = product.querySelector("a.styles__StyledLink-sc-vpsldm-0");
            const titleElement = product.querySelector("div.grid-item p");
            const priceElement = product.querySelector('div > a > div.product-item--price > span > small');

            // Check if the link, title, and price elements exist before accessing their properties
            // const link = linkElement ? linkElement.href : "";
            const title = titleElement
              ? titleElement.textContent.trim().replace(/\n/g, " ")
              : "";
            const price = priceElement
              ? priceElement.textContent.trim().replace(/\n/g, " ")
              : "";

            // Check if the image element exists before accessing its 'src' property
            const imageElement = product.querySelector("div.product-grid-image--centered img");
            const image = imageElement ? imageElement.srcset : "";

            return { title, image, price };
          });
        });

        const modifiedData = pageData.map((item) => {
          const modifiedImages = item.image.split(',').map((url) => `http:${url.trim()}`);
          const filteredImages = modifiedImages.filter((image) => image.includes('2048w'));
          const formattedImages = filteredImages.map((image) => {
            // Remove the last two characters from the price string to remove the trailing zeros
            const formattedPrice = item.price.slice(0, -2);
            return { title: item.title, image, price: formattedPrice };
          });
          return formattedImages;
        });
        
        // Flatten the array of arrays into a single array of objects
        const flattenedData = [].concat(...modifiedData);
        
        // Now flattenedData contains individual objects for images that contain '2048w' with formatted prices
        data.push(...flattenedData);
        
        // Check if there's a "Next" button on the current page
        const nextButtonExists = await page.evaluate(() => {
          const nextButton = document.querySelector(
            'div > div.grid-item.pagination-border-top > div > div > div > ul > li > a[title="Next »"]'
          );
          return !!nextButton && !nextButton.disabled;
        });

        // If a "Next" button exists, click it and proceed to the next page
        if (nextButtonExists) { 
          // Click on the "Next" button
          await page.evaluate(() => {
            const nextButton = document.querySelector(
              'div > div.grid-item.pagination-border-top > div > div > div > ul > li > a[title="Next »"]'
            );
            if (nextButton) {
              nextButton.click();
            }
          });

          // Wait for navigation to complete before continuing
          // await page.waitForNavigation();
          await page.waitForTimeout(5000);

          // Recursively scrape the next page
          await scrapeCurrentPage();
        }
      };

      await scrapeCurrentPage();

      // console.log(data)

      // Specify the output path for the Excel file inside the 'coffe' directory
      const outputDirectory = "./jersey"; // Relative path to the 'coffe' directory
      const outputFilePath = path.join(__dirname, outputDirectory, "jersey2.xlsx");

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, outputFilePath);

      await page.close(); // Close the page after you're done with it
    // }

    await browser.close();
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();
