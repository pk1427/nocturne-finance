import { NextResponse } from "next/server";

const INTERACT_SERVER_URL = process.env.INTERACT_SERVER_URL || "http://localhost:6301";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const endpoint = body?.commit === true ? "commit" : "prove";

    const response = await fetch(`${INTERACT_SERVER_URL}/api/contract/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Request failed" }, { status: 500 });
  }
}
