// this route fetch's suburls and passes those url with a prompt to grok to generate cover letter
import { NextRequest, NextResponse } from "next/server";
import { getSubURLs } from "@/utils/SubUrls";
import { coverLetter } from "@/utils/GenerateCoverLetter";
import { COVERLETTER_IGNOREKEYWORDS } from "@/constants/constant";

export async function GET() {
  return NextResponse.json("UP and RUNNING");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mainUrl = body.url;
    const resumeUrl = body.resumeUrl;
    const template = body.template;
    const apiKey = body.api;

    if (!mainUrl || !mainUrl.startsWith("http")) {
      return NextResponse.json(
        { error: "Invalid or missing URL" },
        { status: 400 }
      );
    }
    if (!resumeUrl || !template) {
      return NextResponse.json(
        { error: "Missing resume URL or template" },
        { status: 400 }
      );
    }

    const pages = await getSubURLs(mainUrl, COVERLETTER_IGNOREKEYWORDS);
    const result = await coverLetter(
      {
        pages,
        resumeUrl,
        template,
      },
      apiKey
    );
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("API Error:", err);
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: err.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
