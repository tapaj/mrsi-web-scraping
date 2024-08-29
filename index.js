const axios = require("axios");
const cheerio = require("cheerio");

async function scrapeDirectoryListing() {
  const url = `https://www.mrsi.co.in/mrsicms/ajax/home/getinfo_directory2.jsp`;

  const directoryListingSize = 1;
  const companies = [];
  let count = 0;

  for (let page = 0; page < directoryListingSize; page++) {
    const formData = await buildFormDataForDirectoryListing(page);

    const response = await axios.post(url, formData);
    const html = response.data;

    const $ = cheerio.load(html);
    const listingItems = $(".directory-sec ul li");

    for (let index = 0; index < listingItems.length; index++) {
      const element = listingItems[index];

      const nestedContent = $(element).find("div > div > strong").text();

      companies.push({
        id: count++,
        name: nestedContent.trim(),
      });

      const nestedHTML = $(element).find("div > div").html();
    }
  }

  return companies;
}

async function buildFormDataForDirectoryListing(page) {
  const formData = new FormData();

  formData.append("directory", "yes");
  formData.append("nextValue", page);
  formData.append("next", "n");
  formData.append("type", 1);
  formData.append("search", "");
  formData.append("doDirect", page);
  formData.append("researchServices", "");
  formData.append("specialities", "");
  formData.append("industries", "");

  return formData;
}

(async () => {
  const companies = await scrapeDirectoryListing();
  console.log(companies);
})();
