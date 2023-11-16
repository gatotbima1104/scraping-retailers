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
    const browser = await puppeteerExtra.launch({
        headless: false,
        executablePath: executablePath(),
        args: ['--start', '--start-maximized']
    });

    const workbook = new ExcelJS.Workbook();
    const data = []; // Move data array inside the main function

    try {
        await workbook.xlsx.readFile(path.join(__dirname, './links.xlsx'));
        const worksheet = workbook.getWorksheet(1);

        const urls = [];
        worksheet.eachRow((row, rowNumber) => {
            const url = row.getCell(1).text;
            if (url && url.startsWith("http")) {
                urls.push(url);
            }
        });

        for (const url of urls) {
            const pageData = await scrapeCurrentPage(browser, url);
            data.push(...pageData);
        }

        const outputDirectory = "./fb";
        const outputFilePath = path.join(__dirname, outputDirectory, "Etsy4.xlsx");

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, outputFilePath);
    } catch (error) {
        console.error("Error reading the Excel file:", error);
    } finally {
        await browser.close();
    }
})();

const scrapeCurrentPage = async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForTimeout(5000);
    console.log('Page loaded:', url);

    // Your scraping logic here...

    await page.waitForSelector('button.sort-reviews-trigger');
    await page.waitForTimeout(2000)
    await page.click('button.sort-reviews-trigger');

    // Wait for the menu to open
    await page.waitForTimeout(3000);

    // Click the specific menu item
    await page.waitForSelector("div[role='menu'] .wt-menu__item.reviews-sort-by-item:nth-child(2)");
    await page.click("div[role='menu'] .wt-menu__item.reviews-sort-by-item:nth-child(2)");

    // Wait for 3 seconds before proceeding to scraping
    await page.waitForTimeout(3000);

    const pageData = await page.evaluate(() => {
        const productElements = Array.from(
            document.querySelectorAll(".shop-home")
        );

        return productElements.map((product) => {
            // Extract data here...
            const linkLastReview = product.querySelector("a.wt-display-block");
            const titleElement = product.querySelector("h1.wt-text-heading");
            const totalSales = product.querySelector('span.wt-text-caption.wt-no-wrap');
            const totalReview = product.querySelector('div.reviews-total');
            const lastReview = product.querySelector('p.shop2-review-attribution');

            // Extract review count using regex
            const reviewCountMatch = totalReview.textContent.match(/\((\d+)\)/);
            const reviewCount = reviewCountMatch ? reviewCountMatch[1] : 'N/A';

            // Check if the link, title, and price elements exist before accessing their properties
            const linkLastRev = linkLastReview ? linkLastReview.href : "";
            const title = titleElement
                ? titleElement.textContent.trim().replace(/\n/g, " ")
                : "";
            const sales = totalSales
                ? totalSales.textContent.trim().replace(/\n/g, " ")
                : "";
            const review = reviewCount;
            const lastrev = lastReview
                ? lastReview.textContent.trim().replace(/\n/g, " ")
                : "";

            // Check if the image element exists before accessing its 'src' property
            const imageElement = product.querySelector("img");
            const image = imageElement ? imageElement.src : "";

            return { title, image, sales, review, lastrev, linkLastRev };
        });
    });

    await page.close();

    return pageData; // Return the data from the current page
};
