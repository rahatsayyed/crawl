import { CONTACTS_IGNOREKEYWORDS } from "@/constants/constant";
import { getSubURLs } from "@/utils/SubUrls";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

const isDev = process.env.NODE_ENV === "development";
const baseUrl = isDev
  ? "http://localhost:8888"
  : process.env.NEXT_PUBLIC_SITE_URL;
const NETLIFY_FUNCTIONS_URL = `${baseUrl}/.netlify/functions`;

export async function POST(request: NextRequest) {
  try {
    const { url, spreadsheetId, sheetName } = await request.json();
    if (!url || !spreadsheetId || !sheetName) {
      return NextResponse.json(
        { error: "url, spreadsheetId, and sheetName are required" },
        { status: 400 }
      );
    }

    const taskId = uuidv4();
    const pages = await getSubURLs(url, CONTACTS_IGNOREKEYWORDS);

    // Trigger emails-background function without awaiting
    fetch(`${NETLIFY_FUNCTIONS_URL}/emails-background`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urlstoFetch: pages,
        spreadsheetId,
        sheetName,
        taskId,
      }),
    }).catch((error) =>
      console.error("Error triggering background function:", error.message)
    );

    return NextResponse.json({ taskId }, { status: 202 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json("up and running");
}
