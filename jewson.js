import puppeteer from "puppeteer";
import * as XLSX from "xlsx";

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: false,
    });

    const url = "https://www.jewson.co.uk/";

    const page = await browser.newPage();
    await page.goto(url);

    await page.waitForSelector('input[name="showVatPrices"]');
    await page.evaluate(() => {
      const checkbox = document.querySelector('input[name="showVatPrices"]');
      if (checkbox) {
        checkbox.click();
      }
    });

    const allLinks = [];

    await page.waitForSelector("nav.menu");
    const links = await page.$$eval(
      "nav.menu div.accordion-toggle__inner a",
      (elements) =>
        elements.map((element) => {
          return {
            href: element.getAttribute("href"),
            text: element.textContent,
          };
        })
    );

    allLinks.push(...links);

    for (const link of allLinks) {
      const linkPage = await browser.newPage();
      await linkPage.goto(url + link.href); // Navigate to the link's URL

      await linkPage.waitForTimeout(5000);

      const data = [];
      const subCategory = link.text; // Use the subCategory from allLinks

      const scrapeCurrentPage = async () => {
        // Wait for the updated prices to load (you may need to adjust the selector and wait time)
        await linkPage.waitForSelector(".product");

        // Extract the data from the current page
        const pageData = await linkPage.evaluate((subCategory) => {
          const productElements = Array.from(
            document.querySelectorAll(".product")
          );

          return productElements.map((product) => {
            const linkElement = product.querySelector("a.product__thumb");
            const titleElement = product.querySelector("p.product__name");
            const priceElement = product.querySelector("span.price__value");

            // Check if the link, title, and price elements exist before accessing their properties
            const link = linkElement ? linkElement.href : "";
            const title = titleElement
              ? titleElement.textContent.trim().replace(/\n/g, " ")
              : "";
            const price = priceElement
              ? priceElement.textContent.trim().replace(/\n/g, " ")
              : "";

            // Check if the image element exists before accessing its 'src' property
            const imageElement = product.querySelector("img.img-responsive");
            const image = imageElement ? imageElement.src : "";

            return { link, subCategory, title, price, image };
          });
        }, subCategory);

        data.push(...pageData);

        // Check if there's a "Next" button on the current page
        const nextButtonExists = await linkPage.evaluate(() => {
          const nextButton = document.querySelector(
            "li.paging__entry.paging__entry--last > a.paging__link"
          );
          return !!nextButton;
        });

        // If a "Next" button exists, click it and proceed to the next page
        if (nextButtonExists) {
          // Click on the "Next" button
          await linkPage.evaluate(() => {
            const nextButton = document.querySelector(
              "li.paging__entry.paging__entry--last > a.paging__link"
            );
            if (nextButton) {
              nextButton.click();
            }
          });

          // Wait for navigation to complete before continuing
          await linkPage.waitForNavigation();
          await linkPage.waitForTimeout(5000);

          // Recursively scrape the next page
          await scrapeCurrentPage();
        }
      };

      await scrapeCurrentPage();

      // Save the data for this subCategory to an Excel file
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, `${subCategory}.xlsx`);

      await linkPage.close(); // Close the page after you're done with it
    }

    await browser.close();
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();