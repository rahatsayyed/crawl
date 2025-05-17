import { NextRequest, NextResponse } from "next/server";
import { getSubURLs } from "./crawl";

export async function GET() {
  return NextResponse.json("UP and RUNNING");
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

    const result = await getSubURLs(mainUrl);
    return NextResponse.json(result);
  } catch (err) {
    console.error("API Error:", err);
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
