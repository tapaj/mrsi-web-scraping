const puppeteer = require("puppeteer");
const xlsx = require("xlsx");

const startScraping = async (url) => {
  const dataArray = [];

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(url);

  await page.waitForSelector(".directory-sec ul li");

  let listingItems = await page.$$(".directory-sec ul li");

  for (let index = 0; index < listingItems.length; index++) {
    const listingItem = listingItems[index];
    // Extracting the company name
    const companyName = await listingItem.$eval(
      "div > div > div > strong",
      (el) => el.textContent.trim()
    );

    // Clicking on the link to view additional details
    const link = await listingItem.$("div > div > div:last-child > a");
    await Promise.all([page.waitForNavigation(), link.click()]);

    // Extract data from the next page
    const addressElement = await page.$(
      ".research-box .research-box-detail:first-child > p:first-child"
    );
    const address = addressElement
      ? await page.evaluate((el) => el.textContent.trim(), addressElement)
      : "";

    const contactNumberElement = await page.$(
      ".research-box .research-box-detail:first-child > p:nth-child(2)"
    );
    const contactNumber = contactNumberElement
      ? await page.evaluate((el) => el.textContent.trim(), contactNumberElement)
      : "";

    const socialMediaLinksElement = await page.$("li.social-box1");

    let socialMediaLinks = [];

    if (socialMediaLinksElement) {
      socialMediaLinks = await page.$$eval("li.social-box1 a", (links) => {
        return links.map((link) => ({
          platform: link
            .querySelector("span")
            .className.split(" ")[1]
            .replace("fa-", ""),
          url: link.href,
        }));
      });
    }

    console.log("Company name : ", companyName);
    console.log("Address : ", address);
    console.log("Contact Number : ", contactNumber);
    console.log("Social media links : ", socialMediaLinks);

    dataArray.push({
      "Company name": companyName,
      "Address": address,
      "Contact Number": contactNumber,
      "Social media links": socialMediaLinks,
    });

    // Go back to the original page and wait for it to load
    await page.goBack();
    // await new Promise((resolve) => setTimeout(resolve, 3000));
    await page.waitForSelector(".directory-sec ul li");
    listingItems = await page.$$(".directory-sec ul li");

    if (index === listingItems.length - 1) {
      // Check if next page is available
      const nextPageElement = await page.$("ul.pagination li.next a");

      if (nextPageElement) {
        await nextPageElement.click();
        index = 0;
        await page.waitForSelector(".directory-sec ul li");
        listingItems = await page.$$(".directory-sec ul li");
      }
    }
  }

  await browser.close();

  return dataArray;
};

(async () => {
  const dataArray = await startScraping(
    "https://www.mrsi.co.in/mrsicms/home/HomeAction?doDirectorys=yes&type=1"
  );

  // Create a new workbook and add a worksheet
  const workbook = xlsx.utils.book_new();
  const worksheetData = [];

  // Write the headers
  worksheetData.push([
    "Company name",
    "Address",
    "Contact Number",
    "Social media platform",
    "Social media URL",
  ]);

  // Write the data
  dataArray.forEach((data) => {

    const baseRow = [
      data["Company name"],
      data["Address"],
      data["Contact Number"],
    ];

    console.log(data["Company Name"])

    // If no social media links, still add the base row
    if (
      data["Social media links"].length === 0
    ) {
      worksheetData.push([...baseRow, "", ""]);
    } else {
      // Add the first row with the base data and the first social media link
      const firstLink = data["Social media links"][0];
      worksheetData.push([...baseRow, firstLink["platform"], firstLink["url"]]);

      // Add subsequent rows with only the social media links
      for (let i = 1; i < data["Social media links"].length; i++) {
        const link = data["Social media links"][i];
        worksheetData.push(["", "", "", link["platform"], link["url"]]);
      }
    }
  });

  // Convert the data to a worksheet
  const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);

  // Append the worksheet to the workbook
  xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  // Write the workbook to a file
  xlsx.writeFile(workbook, "scraped_data.xlsx");

  console.log("Data has been written to scraped_data.xlsx");
})();
