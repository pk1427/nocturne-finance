import { NextResponse } from "next/server";

const INTERACT_SERVER_URL = process.env.INTERACT_SERVER_URL || "http://localhost:6301";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, amount } = body;

    if (!action || !["deposit", "withdraw", "borrow", "repay"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const response = await fetch(`${INTERACT_SERVER_URL}/api/contract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, amount }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Request failed" }, { status: 500 });
  }
}
