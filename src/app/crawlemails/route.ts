import { NextRequest, NextResponse } from "next/server";
import { crawlWebsite } from ".";

export async function GET(request: NextRequest) {
  try {
    // Extract the 'url' parameter from the query string
    const { searchParams } = new URL(request.url);
    const mainUrl = searchParams.get("url");

    // Validate the URL
    if (!mainUrl || !mainUrl.startsWith("http")) {
      return NextResponse.json(
        { error: "Invalid or missing URL" },
        { status: 400 }
      );
    }

    // Call the crawlWebsite function with the provided URL
    const result = await crawlWebsite(mainUrl);

    return NextResponse.json(result);
  } catch (err) {
    console.error("API Error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mainUrl = body.url;

    if (!mainUrl || !mainUrl.startsWith("http")) {
      return NextResponse.json(
        { error: "Invalid or missing URL" },
        { status: 400 }
      );
    }

    const result = await crawlWebsite(mainUrl);

    return NextResponse.json(result);
  } catch (err) {
    console.error("API Error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
