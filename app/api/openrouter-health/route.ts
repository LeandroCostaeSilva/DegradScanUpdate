import { NextResponse } from "next/server"

export async function GET() {
  const hasKey = Boolean(process.env.OPEN_ROUTER_API_KEY || process.env.OPENROUTER_API_KEY)
  let status: number | null = null
  let ok = false
  let error: string | null = null

  try {
    const resp = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${process.env.OPEN_ROUTER_API_KEY || process.env.OPENROUTER_API_KEY || ""}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "HTTP-Referer": "http://localhost:3000/",
        "X-Title": "DegradScan",
      },
    })
    status = resp.status
    ok = resp.ok
    if (!resp.ok) {
      error = await resp.text().catch(() => "")
    }
  } catch (e: any) {
    error = e?.message || String(e)
  }

  return NextResponse.json({ hasKey, ok, status, error })
}

