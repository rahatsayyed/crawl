import { NextRequest, NextResponse } from "next/server";
import { crawlWebsite } from ".";

export async function GET() {
  return NextResponse.json({ message: "up and running" });
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
