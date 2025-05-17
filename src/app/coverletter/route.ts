import { NextRequest, NextResponse } from "next/server";
import { getSubURLs } from "./crawl";
import { coverLetter } from "./generate";

export async function GET() {
  return NextResponse.json("UP and RUNNING");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mainUrl = body.url;
    const resumeUrl = body.resumeUrl;
    const template = body.template;

    if (!mainUrl || !mainUrl.startsWith("http")) {
      return NextResponse.json(
        { error: "Invalid or missing URL" },
        { status: 400 }
      );
    }

    const pages = await getSubURLs(mainUrl);
    // const result = await coverLetter({
    //   pages,
    //   resumeUrl,
    //   template,
    // });
    return NextResponse.json(pages);
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
