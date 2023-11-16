import puppeteer from "puppeteer";
import axios from "axios";
import fs from "fs";
import ExcelJS from "exceljs";
import path from "path";

async function downloadImages() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const downloadDirectory = './photos'; // Define the download directory

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('./keys.xlsx');

    const worksheet = workbook.getWorksheet('Sheet1'); // Change the sheenodet name if necessary

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const brandName = worksheet.getCell(rowNumber, 1).text; // Assuming brand names are in column A (1st column)
      const photoUrl = worksheet.getCell(rowNumber, 2).text; // Assuming URLs are in column B (2nd column)

      if (brandName && photoUrl) {
        try {
          console.log(`Downloading image from: ${photoUrl}`);

          const response = await axios.get(photoUrl, { responseType: 'stream' });

          const imageName = `${brandName}.png`;
          const imagePath = path.join(downloadDirectory, imageName); // Define the full path to save the image

          const writer = fs.createWriteStream(imagePath);
          response.data.pipe(writer);

          await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
          });

          console.log(`Downloaded: ${imagePath}`);

          // Introduce a 2-second delay
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error downloading ${photoUrl}: ${error.message}`);
        }
      }
    }

  } catch (error) {
    console.error(`Error reading Excel file: ${error.message}`);
  } finally {
    await browser.close();
  }
}

downloadImages();
