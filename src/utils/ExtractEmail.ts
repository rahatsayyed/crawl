import { MAXCONCURRENTPAGES } from "@/constants/constant";
import { ContactData } from "@/types/types";
import axios from "axios";
import * as cheerio from "cheerio";
import https from "https";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.101 Safari/537.36",
];

// Utility to get random User-Agent
const getRandomUserAgent = () => {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
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
    const { data } = await axios.get(url, {
      httpsAgent: new https.Agent({
        rejectUnauthorized: false, // Bypass SSL verification
      }),
      headers: {
        "User-Agent": getRandomUserAgent(), // Rotate User-Agent
      },
    });
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
    // throw error;
    return {
      emails: [],
      phones: [],
    };
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
export const crawlEmails = async (subURLs: string[]): Promise<ContactData> => {
  try {
    const emailSet = new Set<string>();
    const phoneSet = new Set<string>();

    const results = await processInBatches(
      subURLs,
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
