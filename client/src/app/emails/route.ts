import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

// Configure Puppeteer for serverless environment
chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

export async function POST(request: NextRequest) {
  try {
    // Parse request body to get the URL
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'url' field" },
        { status: 400 }
      );
    }

    // Launch Puppeteer browser
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath:
        process.env.CHROME_EXECUTABLE_PATH ||
        (await chromium.executablePath("/var/task/node_modules/@sparticuz/chromium/bin")),
    });

    // Open a new page
    const page = await browser.newPage();

    // Navigate to the provided URL
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Extract email addresses from page content
    const emails = await page.evaluate(() => {
      // Get all text content from the page
      const textContent = document.body.innerText;
      // Regular expression to match email addresses
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      // Find all matches and remove duplicates
      const matches = textContent.match(emailRegex) || [];
      return [...new Set(matches)]; // Return unique emails
    });

    // Close the browser
    await browser.close();

    // Return the extracted emails
    return NextResponse.json({ emails }, { status: 200 });
  } catch (error: any) {
    console.error("Puppeteer Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}