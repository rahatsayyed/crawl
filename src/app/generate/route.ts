import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "up and running" });
}

export async function POST(request: NextRequest) {
  try {
   const result= {
        email: [{ name: "Hr", email: "hr@domain.com" }, { name: "domain Team", email: "info@domain.com" }],
        message: "Complete HTML-formatted cover letter with personalized content"
      }
    return NextResponse.json(result);
  } catch (err) {
    console.error("API Error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
