import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const type = url.searchParams.get("type") || "compound"
  const q = (url.searchParams.get("q") || "").trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ items: [] })
  }

  try {
    const endpoint = `https://pubchem.ncbi.nlm.nih.gov/rest/autocomplete/${encodeURIComponent(type)}/${encodeURIComponent(q)}/json`
    const resp = await fetch(endpoint, { headers: { Accept: "application/json" } })
    if (!resp.ok) {
      return NextResponse.json({ items: [], error: `HTTP ${resp.status}` }, { status: 200 })
    }
    const data = await resp.json()
    const arr: string[] = data?.dictionary_terms?.[type] || []
    return NextResponse.json({ items: arr })
  } catch (e: any) {
    return NextResponse.json({ items: [], error: e?.message || String(e) }, { status: 200 })
  }
}

