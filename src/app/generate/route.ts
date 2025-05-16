import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "up and running" });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const emails = body.emails;
  const data = body.data;
  const template = body.template;
  try {
    const result = coverLetter(template, data, emails);
    return NextResponse.json(result);
  } catch (err) {
    console.error("API Error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
function coverLetter(template: any, data: any, emails: any) {
  throw new Error("Function not implemented.");
}
