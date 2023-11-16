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
      headless: true,
      executablePath: executablePath()
    });

    // const url = "https://www.gys.fr/prod-062375-P268/_P268/EXPERT_110/en"

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('./mikeb/welding2.xlsx');
    const worksheet = workbook.getWorksheet(1);

    const columnA = worksheet.getColumn('A').values.slice(2); // Extract URLs from column A starting from row 2

    const data = []
    const missingData = []

    for (const urlText of columnA) {
        try {
            const url = new URL(urlText)
            const page = await browser.newPage();
            await page.goto(url.href, { waitUntil: 'domcontentloaded'}); // Assuming the URL is in the text property of the cell object
            await page.waitForTimeout(3000);
      
            const pageData = await page.evaluate(() => {
                const linkProduct = window.location.href
                const productElements = Array.from(document.querySelectorAll("div#blocImgFiches"));
                return productElements.map((product) => {
                  const titleElement = product.querySelector("#productInfo > div > h2");
                  const refElement = product.querySelector("#productInfo > div > span:nth-child(2)");
                  const eanCode = product.querySelector("#productInfo > div > span:nth-child(3)");
                  const dataSheet = product.querySelector("#descriptionFiches > div:nth-child(1) > div.celluleBas.padLeftDrapeaux > div:nth-child(3) > a");
                  const manuals = product.querySelector("#descriptionFiches > div:nth-child(2) > div.celluleBas.padLeftDrapeaux > div:nth-child(3) > a");
                  const imageElement = product.querySelector("img#picPrnc");

                  const title = titleElement ? titleElement.textContent.trim().replace(/\n/g, " ") : "";
                  const refNum = refElement ? refElement.textContent.trim().replace(/\n/g, " ").replace("Ref : ", "") : "";
                  const eanNum = eanCode ? eanCode.textContent.trim().replace(/\n/g, " ").replace("EAN CODE : ", "") : "";
                  const datasheet = dataSheet ? dataSheet.href : "";
                  const manualBook = manuals ? manuals.href : "";

                  const image = imageElement ? imageElement.src : "";
                  return { linkProduct, title, image, refNum, eanNum, datasheet, manualBook  };
              });
            });

            if(pageData.length > 0){
              data.push(...pageData)

            }else{
              missingData.push(url.href)
            }

            // Output the scraped data for the current URL
            // console.log(pageData);
            

            await page.close();
        } catch (error) {
            console.log(`Error scraping`);
        }
    }

      const outputDirectory = "./mikeb/result"; // Relative path to the 'coffe' directory
      const outputFilePath = path.join(__dirname, outputDirectory, "fix-welding2.xlsx");

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, outputFilePath);

      // Write missing elements links to another Excel file
      const missingElementsFilePath = path.join(__dirname, outputDirectory, "no-data-welding2.xlsx");
      const missingElementsWs = XLSX.utils.json_to_sheet(missingData.map(link => ({ link })));
      const missingElementsWb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(missingElementsWb, missingElementsWs, "Sheet1");
      XLSX.writeFile(missingElementsWb, missingElementsFilePath);
    // console.log(data)

    await browser.close();
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();