import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import { URL } from "url";
import fs from "fs";
const IGNOREKEYWORDS = [
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

const MAXDEPTH = 2;
const MAXPAGESPERPREFIX = 2;
const NAVIGATION_TIMEOUT = 45000;
const MAX_CONCURRENT_PAGES = 3;
const RETRY_ATTEMPTS = 2;

const shouldIgnore = (url) =>
  IGNOREKEYWORDS.some((keyword) => url.toLowerCase().includes(keyword));

const getPathDepth = (pathname) => pathname.split("/").filter(Boolean).length;

const launchBrowser = async () => {
  return await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-http2",
    ],
    protocolTimeout: 60000,
  });
};

const setupPage = async (browser) => {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (["image", "stylesheet", "font", "media"].includes(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );
  page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
  return page;
};

const fetchWithRetry = async (page, url, options, retries = RETRY_ATTEMPTS) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await page.goto(url, options);
      return true;
    } catch (err) {
      if (attempt === retries) {
        console.warn(
          `Failed to load ${url} after ${retries} attempts: ${err.message}`
        );
        return false;
      }
      console.warn(
        `Retrying ${url} (Attempt ${attempt}/${retries}): ${err.message}`
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return false;
};

export const getSubURLs = async (mainUrl) => {
  let browser;
  try {
    browser = await launchBrowser();
    const page = await setupPage(browser);

    const success = await fetchWithRetry(page, mainUrl, {
      waitUntil: "domcontentloaded",
      timeout: NAVIGATION_TIMEOUT,
    });
    if (!success) {
      console.warn(
        `Could not load main URL ${mainUrl}. Returning empty subpages.`
      );
      return [];
    }

    const html = await page.content();
    const $ = cheerio.load(html);

    const subpages = new Set();
    const prefixCounter = {};

    const prioritySections = $("header, nav, footer, main, section").find("a")
      .length
      ? $("header, nav, footer, main, section")
      : $.root();

    prioritySections.find("a").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      try {
        const fullUrl = new URL(href, mainUrl);
        if (
          fullUrl.hostname !== new URL(mainUrl).hostname ||
          shouldIgnore(fullUrl.href)
        )
          return;

        const pathname = fullUrl.pathname;
        if (getPathDepth(pathname) > MAXDEPTH) return;

        const prefix = pathname.split("/")[1] || "";
        prefixCounter[prefix] = (prefixCounter[prefix] || 0) + 1;
        if (prefixCounter[prefix] > MAXPAGESPERPREFIX) return;

        subpages.add(fullUrl.href);
      } catch {
        // Skip invalid URLs
      }
    });

    console.log(`Subpages found: ${subpages.size}`);
    return Array.from(subpages);
  } catch (err) {
    console.error("Error fetching subURLs:", err.message);
    return [];
  } finally {
    if (browser) await browser.close();
  }
};

const extractEmailsAndPhones = ($, element) => {
  const emails = new Set();
  const phones = new Set();

  // Email regex with strict boundaries
  const emailRegex =
    /(?:^|\s)([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?=\s|$)/g;
  const phoneRegex =
    /(\+\d{1,4}[\s-]?)?(\(?\d{2,4}\)?[\s.-]?)?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g;

  // Extract emails from mailto links
  element.find("a[href^='mailto:']").each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      const email = href.replace(/^mailto:/i, "").split("?")[0]; // Remove mailto: and query params
      if (email.match(emailRegex)) {
        emails.add(email);
      }
    }
  });

  // Extract emails and phones from text nodes
  const traverseNodes = (node) => {
    if (node.type === "text") {
      let text = node.data.replace(/\s+/g, " ").trim();
      // Skip empty text nodes
      if (!text) return;

      // Preprocess to separate concatenated emails
      text = text.replace(
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?=[A-Z0-9][a-zA-Z0-9]*\b)/g,
        "$1 "
      );

      // Extract emails
      const emailMatches = text.match(emailRegex) || [];
      emailMatches.forEach((email) => emails.add(email.trim()));

      // Extract phones
      const phoneMatches = text.match(phoneRegex) || [];
      phoneMatches
        .map((p) => p.trim())
        .filter((num) => num.replace(/\D/g, "").length >= 8)
        .forEach((phone) => phones.add(phone));
    }

    // Recursively process child nodes
    if (node.childNodes) {
      node.childNodes.forEach((child) => traverseNodes(child));
    }
  };

  traverseNodes(element[0]);

  return {
    emails: [...emails],
    phones: [...phones],
  };
};

const extractMainTextFromPage = async (url, browser) => {
  let page;
  try {
    page = await setupPage(browser);
    const success = await fetchWithRetry(page, url, {
      waitUntil: "domcontentloaded",
      timeout: NAVIGATION_TIMEOUT,
    });
    if (!success) return { url, text: "", emails: [], phones: [] };

    const html = await page.content();
    const $ = cheerio.load(html);
    $("script, style").remove();

    // Extract emails and phones from the entire body
    const { emails, phones } = extractEmailsAndPhones($, $("body"));
    fs.writeFileSync(`./data2/data${url}.txt`, $("body").text());

    // Store raw text for reference (optional)
    const text = $("body").text().replace(/\s+/g, " ").trim();

    return { url, text, emails, phones };
  } catch (err) {
    console.warn(`Failed to fetch ${url}: ${err.message}`);
    return { url, text: "", emails: [], phones: [] };
  } finally {
    if (page) await page.close();
  }
};

const processInBatches = async (items, batchSize, processFn) => {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processFn));
    results.push(...batchResults);
  }
  return results;
};

export const crawlWebsite = async (mainUrl) => {
  let browser;
  try {
    browser = await launchBrowser();
    const pages = await getSubURLs(mainUrl);

    const results = await processInBatches(
      pages,
      MAX_CONCURRENT_PAGES,
      (pageUrl) => extractMainTextFromPage(pageUrl, browser)
    );

    const emailSet = new Set();
    const phoneSet = new Set();
    const data = {};

    results.forEach(({ url: pageUrl, text, emails, phones }) => {
      if (text) data[pageUrl] = text;
      emails.forEach((email) => emailSet.add(email));
      phones.forEach((phone) => phoneSet.add(phone));
    });
    console.log(Array.from(emailSet));
    console.log(Array.from(phoneSet));
    return {
      emails: Array.from(emailSet),
      phones: Array.from(phoneSet),
    };
  } catch (err) {
    console.error("Crawl Error:", err.message);
    throw new Error("Failed to crawl website");
  } finally {
    if (browser) await browser.close();
  }
};

crawlWebsite("https://github.com/rahatsayyed/");
