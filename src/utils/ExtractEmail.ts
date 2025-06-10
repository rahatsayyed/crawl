import { MAXCONCURRENTPAGES } from "@/constants/constant";
import { ContactData } from "@/types/types";
import axios, { AxiosError } from "axios";
import * as cheerio from "cheerio";
import https from "https";
import pLimit from "p-limit"; // Add p-limit for concurrency control
import * as fs from "fs";
// List of User-Agent strings for rotation
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.101 Safari/537.36",
];

// Utility to get random User-Agent
const getRandomUserAgent = () => {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
};

// Utility for delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Extract emails and phones (unchanged)
const extractEmailsAndPhones = ($: cheerio.CheerioAPI) => {
  const emails = new Set<string>();
  const phones = new Set<string>();

  const emailRegex =
    /(?:^|\s)([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?=\s|$)/g;
  const phoneRegex =
    /(\+\d{1,4}[\s-]?)?(\(?\d{2,4}\)?[\s.-]?)?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g;

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

  const traverseNodes = (node: any, i = 1) => {
    if (node.type === "text") {
      let text = node.data.replace(/\s+/g, " ").trim();
      if (!text) return;
      fs.writeFileSync(`./data/test-${i}.txt`, text); // Save text to file for debugging
      text = text.replace(
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?=[A-Z0-9][a-zA-Z0-9]*\b)/g,
        "$1 "
      );

      const emailMatches: string[] = text.match(emailRegex) || [];
      emailMatches.forEach((email: string) => emails.add(email.trim()));

      const phoneMatches: string[] = text.match(phoneRegex) || [];
      phoneMatches
        .map((p: string) => p.trim())
        .filter((num) => num.replace(/\D/g, "").length >= 8)
        .forEach((phone) => phones.add(phone));
    }

    if (node.childNodes) {
      node.childNodes.forEach((child: any) => traverseNodes(child, i++));
    }
  };

  traverseNodes($("body")[0]);

  return {
    emails: [...emails],
    phones: [...phones],
  };
};

// Extract main text with retry logic
const extractMainTextFromPage = async (
  url: string,
  retries = 3
): Promise<ContactData> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
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
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`Attempt ${attempt} failed for ${url}: ${errorMsg}`);

      if (error.response?.status === 429 && attempt < retries) {
        // Handle 429 Too Many Requests with exponential backoff
        const backoffTime = Math.pow(2, attempt) * 1000 + Math.random() * 100; // Exponential backoff + jitter
        console.log(
          `Rate limit hit, waiting ${backoffTime}ms before retrying...`
        );
        await delay(backoffTime);
        continue;
      }

      console.warn(`Failed to fetch or parse ${url}: ${errorMsg}`);
      return {
        emails: [],
        phones: [],
      };
    }
  }
  return { emails: [], phones: [] }; // Return empty if all retries fail
};

// Process in batches with concurrency control
const processInBatches = async (
  items: string[],
  batchSize: number,
  processFn: (pageUrl: string) => Promise<ContactData>
) => {
  const limit = pLimit(batchSize); // Limit concurrent requests
  const results: ContactData[] = [];
  const batchDelay = 1000; // Delay between batches (1 second)

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((pageUrl) => limit(() => processFn(pageUrl)))
    );
    results.push(...batchResults);
    if (i + batchSize < items.length) {
      // Add delay between batches, except for the last batch
      console.log(`Waiting ${batchDelay}ms before next batch...`);
      await delay(batchDelay);
    }
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
