import { NextResponse } from "next/server"

async function fetchCID(name: string) {
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/cids/JSON`
  const resp = await fetch(url, { headers: { Accept: "application/json" } })
  if (!resp.ok) return null
  const data = await resp.json()
  const cid = data?.IdentifierList?.CID?.[0]
  return typeof cid === "number" ? cid : null
}

async function fetchProperties(cid: number) {
  const props = [
    "MolecularFormula",
    "MolecularWeight",
    "CanonicalSMILES",
    "IsomericSMILES",
    "InChIKey",
    "IUPACName",
    "XLogP",
    "TPSA",
    "HBondDonorCount",
    "HBondAcceptorCount",
    "RotatableBondCount",
  ].join(",")
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/${props}/JSON`
  const resp = await fetch(url, { headers: { Accept: "application/json" } })
  if (!resp.ok) return null
  const data = await resp.json()
  const row = data?.PropertyTable?.Properties?.[0] || {}
  return row
}

async function fetchSynonyms(cid: number) {
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`
  const resp = await fetch(url, { headers: { Accept: "application/json" } })
  if (!resp.ok) return []
  const data = await resp.json()
  const syns = data?.InformationList?.Information?.[0]?.Synonym || []
  return Array.isArray(syns) ? syns.slice(0, 50) : []
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const name = (url.searchParams.get("name") || "").trim()
  if (!name) return NextResponse.json({ error: "missing name" }, { status: 400 })
  const cid = await fetchCID(name)
  if (!cid) return NextResponse.json({ error: "cid_not_found", name })
  const properties = (await fetchProperties(cid)) || {}
  const synonyms = await fetchSynonyms(cid)
  return NextResponse.json({ name, cid, properties, synonyms })
}

