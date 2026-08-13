import { NextResponse } from "next/server";

const INTERACT_SERVER_URL = process.env.INTERACT_SERVER_URL || "http://localhost:6301";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const accountId = new URL(request.url).searchParams.get("accountId");
  if (!accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${INTERACT_SERVER_URL}/api/contract/position?accountId=${encodeURIComponent(accountId)}`,
      { cache: "no-store" },
    );
    return NextResponse.json(await response.json(), { status: response.status });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not reach proof server" },
      { status: 500 },
    );
  }
}
