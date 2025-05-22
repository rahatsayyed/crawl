import { NextRequest, NextResponse } from "next/server";
import { crawlWebsite } from ".";

export async function GET(request: NextRequest) {
  try {
    // Extract the 'url' parameter from the query string

    return NextResponse.json("up and running");
  } catch (error: any) {
    console.error("API Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
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
  } catch (error: any) {
    console.error("API Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
