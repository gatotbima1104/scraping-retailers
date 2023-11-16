import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import ExcelJS from "exceljs";
import path from 'path';
import * as XLSX from "xlsx";

puppeteerExtra.use(StealthPlugin());

import { fileURLToPath } from 'url';
import { executablePath } from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  try {
    const browser = await puppeteerExtra.launch({
      headless: 'new',
      executablePath: executablePath()
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('./digital/extracted-video-course.xlsx');
    const worksheet = workbook.getWorksheet(1);

    const columnA = worksheet.getColumn('A').values.slice(2); // Extract URLs from column A starting from row 2

    const data = []
    let count = 1;

    for (const url of columnA) {
      try {
            const item = new URL(url)
            // console.log(url)
            console.log(`The item ${count} is ${item}`)
            const page = await browser.newPage();
            await page.goto(item, {waitUntil: 'domcontentloaded'}); // Assuming the URL is in the text property of the cell object
            await page.waitForTimeout(1000);
      
            const pageData = await page.evaluate(() => {
              const productElements = Array.from(document.querySelectorAll("div#primary"));
            
              function getTextContentExcludingElements(element, excludedTags, stopKeyword) {
                let textContent = '';
            
                function processNode(node) {
                    if (node.nodeType === 3) {
                        // If it's a text node, append its text content
                        textContent += node.textContent;
                    } else if (node.nodeType === 1) {
                        // If it's an element node
                        const tagName = node.tagName.toLowerCase();
            
                        if (textContent.includes(stopKeyword)) {
                            // Stop processing when the specified stop keyword is encountered
                            return;
                        }
            
                        if (!excludedTags.includes(tagName)) {
                            // If the element is not in the excluded list, process its children
                            for (const childNode of node.childNodes) {
                                processNode(childNode);
                            }
                        }
                    }
                }
            
                processNode(element);
                return textContent.trim();
            }
              return productElements.map((product) => {
                const titleElement = product.querySelector("div.summary.entry-summary > h2");
                const priceElement = product.querySelector('div.summary.entry-summary > p > ins > span > bdi');
                const imageElement = product.querySelector("figure > div > a > img");
                // const desc = product.querySelector("#tab-description > p:nth-child(3)");
                const desc = product.querySelector("#tab-description");

        
                const descEle = desc ? getTextContentExcludingElements(desc, ['h2', 'h3'], 'License').replace(/\n/g, " ") : "";
                const title = titleElement ? titleElement.textContent.trim().replace(/\n/g, " ") : "";
                const price = priceElement ? priceElement.textContent.trim().replace(/\n/g, " ") : "";
                const image = imageElement ? imageElement.src : "";
        
                return { title, image, price, descEle };
            });
            });
            
            data.push(...pageData)
            // console.log(data)
            count++

            await page.close();
        } catch (error) {
            console.log(`Error scraping`);
        }
    }

    const outputDirectory = "./digital/fix"; // Relative path to the 'coffe' directory
      const outputFilePath = path.join(__dirname, outputDirectory, "video-course.xlsx");

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, outputFilePath);

    await browser.close();
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();