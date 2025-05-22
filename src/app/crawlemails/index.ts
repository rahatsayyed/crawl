import axios from "axios";
import * as cheerio from "cheerio";
import { URL } from "url";
import { ContactData } from "./types";

// Constants (assumed to be in ./constant)
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
const MAXCONCURRENTPAGES = 3;
const MAXDEPTH = 2;
const MAXPAGESPERPREFIX = 2;

// Utility functions
const shouldIgnore = (url: string): boolean => {
  return IGNOREKEYWORDS.some((keyword) => url.toLowerCase().includes(keyword));
};

const getPathDepth = (pathname: string): number => {
  return pathname.replace(/\/$/, "").split("/").filter(Boolean).length;
};

// Extract subpages
const getSubURLs = async (mainUrl: string): Promise<string[]> => {
  try {
    const response = await axios.get(mainUrl);
    const $: cheerio.CheerioAPI = cheerio.load(response.data);
    const subpages = new Set<string>();
    const prefixCounter: Record<string, number> = {};

    let prioritySections: cheerio.Cheerio<any> = $(
      "header, nav, footer, main, section"
    );
    if (prioritySections.find("a").length === 0) prioritySections = $.root();

    prioritySections.find("a").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      try {
        const fullUrl = new URL(href, mainUrl);
        const fullHref = fullUrl.href;

        if (
          fullUrl.hostname !== new URL(mainUrl).hostname ||
          shouldIgnore(fullHref)
        )
          return;

        const pathname = fullUrl.pathname;
        const depth = getPathDepth(pathname);
        if (depth > MAXDEPTH) return;

        const prefix = pathname.split("/")[1] || "";
        prefixCounter[prefix] = (prefixCounter[prefix] || 0) + 1;
        if (prefixCounter[prefix] > MAXPAGESPERPREFIX) return;

        subpages.add(fullHref);
      } catch {
        // Skip invalid URLs
      }
    });
    subpages.add(mainUrl);
    console.log(`Subpages found: ${subpages.size}`);
    return Array.from(subpages);
  } catch (error: any) {
    console.error(`Error fetching subURLs: ${error.message}`);
    throw new Error(`Error fetching subURLs: ${error.message}`);
  }
};

// Extract emails and phones
const extractEmailsAndPhones = ($: cheerio.CheerioAPI) => {
  const emails = new Set<string>();
  const phones = new Set<string>();

  // Email regex with strict boundaries
  const emailRegex =
    /(?:^|\s)([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?=\s|$)/g;
  const phoneRegex =
    /(\+\d{1,4}[\s-]?)?(\(?\d{2,4}\)?[\s.-]?)?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g;

  // Extract emails from mailto links
  $("body")
    .find("a[href^='mailto:']")
    .each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        const email = href
          .replace(/^mailto:/i, "")
          .split("?")[0]
          .trim();
        if (email && emailRegex.test(email)) {
          emails.add(email);
        }
      }
    });

  // Extract emails and phones from text nodes
  const traverseNodes = (node: any) => {
    if (node.type === "text") {
      let text = node.data.replace(/\s+/g, " ").trim();
      if (!text) return;

      // Preprocess to separate concatenated emails
      text = text.replace(
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?=[A-Z0-9][a-zA-Z0-9]*\b)/g,
        "$1 "
      );

      // Extract emails
      const emailMatches: string[] = text.match(emailRegex) || [];
      emailMatches.forEach((email: string) => emails.add(email.trim()));

      // Extract phones
      const phoneMatches: string[] = text.match(phoneRegex) || [];
      phoneMatches
        .map((p: string) => p.trim())
        .filter((num) => num.replace(/\D/g, "").length >= 8)
        .forEach((phone) => phones.add(phone));
    }

    // Recursively process child nodes
    if (node.childNodes) {
      node.childNodes.forEach((child: any) => traverseNodes(child));
    }
  };

  traverseNodes($("body")[0]);

  return {
    emails: [...emails],
    phones: [...phones],
  };
};

// Extract main text
const extractMainTextFromPage = async (url: string): Promise<ContactData> => {
  try {
    const { data } = await axios.get(url, { timeout: 30000 });
    const $: cheerio.CheerioAPI = cheerio.load(data);
    $("script, style").remove();
    const { emails, phones } = extractEmailsAndPhones($);
    return {
      emails,
      phones,
    };
  } catch (error: any) {
    console.warn(
      `Failed to fetch or parse ${url}:`,
      error instanceof Error ? error.message : error
    );
    throw error;
  }
};

// Process in batches
const processInBatches = async (
  items: string[],
  batchSize: number,
  processFn: (pageUrl: string) => Promise<ContactData>
) => {
  const results: ContactData[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (pageUrl) => await processFn(pageUrl))
    );
    results.push(...batchResults);
  }
  return results;
};

// Main crawl function
export const crawlWebsite = async (mainUrl: string): Promise<ContactData> => {
  try {
    const emailSet = new Set<string>();
    const phoneSet = new Set<string>();

    const pages = await getSubURLs(mainUrl);
    const results = await processInBatches(
      pages,
      MAXCONCURRENTPAGES,
      extractMainTextFromPage
    );

    results.forEach(({ emails, phones }) => {
      emails.forEach((email: string) => emailSet.add(email));
      phones.forEach((phone: string) => phoneSet.add(phone));
    });

    const finalResult = {
      emails: Array.from(emailSet),
      phones: Array.from(phoneSet),
    };
    return finalResult;
  } catch (error: any) {
    console.error(
      "Crawl Error:",
      error instanceof Error ? error.message : error
    );
    throw error;
  }
};

// Example usage
// crawlWebsite("https://www.arkasoftwares.com/");
