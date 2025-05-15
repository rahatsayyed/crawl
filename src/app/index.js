const axios = require("axios");
const cheerio = require("cheerio");
const { URL } = require("url");

// Configurable settings
const ignoreKeywords = [
  "privacy",
  "terms",
  "cookie",
  "legal",
  "#",
  "disclaimer",
  "policy",
  "hire",
  "drupal",
  "joomla",
  "wordpress",
  "cms",
  "power-bi",
  "tableau",
  "xamarin",
  "ecommerce",
  "flutter",
  "react-native",
  "android",
  "ios",
  "mobile-app",
  "vuejs",
  "laravel",
  "angular",
  "reactjs",
  "java",
  "php",
  "dotnet",
  "nodejs",
  "python",
  "full-stack",
  "back-end",
  "front-end",
  "shopify",
  "nopcommerce",
  "guides/tag/",
  "it-outsourcing-roi-calculator",
  "careers",
  "winwithai",
  "newsletter",
  "partner",
  "guide",
  "stories",
  "story",
  "webinar",
  "custom",
  "studies",
  "study",
  "blog",
  "sitemap",
  "free-trial",
  "pricing",
  "videos",
];
// above this is imports and ignoreKeywords don't give those start from below
const maxDepth = 2;
const maxPagesPerPrefix = 3;

function shouldIgnore(url) {
  return ignoreKeywords.some((keyword) => url.toLowerCase().includes(keyword));
}

function getPathDepth(pathname) {
  // Remove trailing slash, split by '/', filter empty parts
  return pathname.replace(/\/$/, "").split("/").filter(Boolean).length;
}

//#region extract subpages
async function getSubURLs(mainUrl) {
  try {
    const response = await axios.get(mainUrl);
    const $ = cheerio.load(response.data);
    const subpages = new Set();
    const prefixCounter = {};
    let prioritySections = $("header, nav, footer, main, section");
    if (prioritySections.find("a").length == 0) prioritySections = $.root();
    prioritySections.find("a").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      try {
        const fullUrl = new URL(href, mainUrl);
        const fullHref = fullUrl.href;
        // Filter to same domain and skip ignored
        if (
          fullUrl.hostname !== new URL(mainUrl).hostname ||
          shouldIgnore(fullHref)
        )
          return;

        const pathname = fullUrl.pathname;

        // Filter by depth
        const depth = getPathDepth(pathname);
        if (depth > maxDepth) return;

        // Check prefix-based page limits
        const prefix = pathname.split("/")[1];
        prefixCounter[prefix] = (prefixCounter[prefix] || 0) + 1;
        if (prefixCounter[prefix] > maxPagesPerPrefix) return;
        subpages.add(fullHref);
      } catch (e) {
        // Skip invalid URLs
      }
    });
    return Array.from(subpages);
  } catch (err) {
    console.error("Error:", err.message);
    return [];
  }
}
//#endregion
//#region Extract emails and phones
function extractEmailsAndPhones(text) {
  const emails = [];
  const phones = [];

  // Regex for email (even weird domains or subdomains)
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const emailMatches = text.match(emailRegex);
  if (emailMatches) {
    emails.push(...new Set(emailMatches));
  }

  // Regex for phone numbers (supports optional +country code)
  const phoneRegex =
    /(\+\d{1,4}[\s-]?)?(\(?\d{2,4}\)?[\s.-]?)?(\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4})/g;
  const phoneMatches = text.match(phoneRegex);
  if (phoneMatches) {
    phones.push(
      ...new Set(
        phoneMatches
          .map((p) => p.trim())
          .filter((num) => num.replace(/\D/g, "").length >= 8) // Ignore short numbers
      )
    );
  }

  return { emails, phones };
}

//#endregion
//#region Extract main text

async function extractMainTextFromPage(url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    $("script, style").remove();
    const text = $("body").text();
    const cleanText = text.replace(/\s+/g, " ").trim();

    // Extract emails and phones
    const { emails, phones } = extractEmailsAndPhones(cleanText);

    return {
      text: cleanText,
      emails,
      phones,
    };
  } catch (err) {
    console.error(`❌ Failed to fetch or parse ${url}: ${err.message}`);
    return { text: "", emails: [], phones: [] };
  }
}

//#endregion
// Example usage
(async () => {
  const emailSet = new Set();
  const phoneSet = new Set();
  const data = {};
  const mainUrl = "https://www.qualitasit.com/";
  const pages = await getSubURLs(mainUrl);

  console.log("✅ Filtered subpages:\n", pages);
  const contentPromises = pages.map(async (url) => {
    const { text, emails, phones } = await extractMainTextFromPage(url);
    return { url, text, emails, phones };
  });
  const results = await Promise.all(contentPromises);
  results.forEach(({ url, text, emails, phones }) => {
    data[url] = text;
    emails.forEach((email) => emailSet.add(email));
    phones.forEach((phone) => phoneSet.add(phone));
  });

  console.log(`\n📧 Emails:`, Array.from(emailSet));
  console.log(`📞 Phones:`, Array.from(phoneSet));
  console.log(data);
})();
