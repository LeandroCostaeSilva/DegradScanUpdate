import { NextResponse } from "next/server"

function extractDoi(s: string): string | null {
  const m = s.match(/10\.[0-9]{4,9}\/[\-._;()/:A-Z0-9]+/i)
  return m ? m[0] : null
}

function extractPmid(s: string): string | null {
  const m = s.match(/pmid\s*:\s*(\d+)/i) || s.match(/\b(\d{7,8})\b/)
  return m ? m[1] || m[0] : null
}

async function fetchCrossref(doi: string) {
  const r = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "DegradScan/1.0 (contact: degradscan.app@example.com)",
    },
  })
  if (!r.ok) return null
  const j = await r.json()
  const m = j.message
  const title = Array.isArray(m.title) ? m.title[0] : m.title
  const authors = Array.isArray(m.author)
    ? m.author.map((a: any) => [a.given, a.family].filter(Boolean).join(" "))
    : []
  const url = m.URL || `https://doi.org/${doi}`
  const journal = Array.isArray(m["container-title"]) ? m["container-title"][0] : m["container-title"] || ""
  const year = Array.isArray(m.issued?.["date-parts"]) ? m.issued["date-parts"][0]?.[0] : null
  return { id: `DOI:${doi}`, title, authors, url, journal, year }
}

async function fetchPubMed(pmid: string) {
  const r = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`,
  )
  if (!r.ok) return null
  const j = await r.json()
  const rec = j.result?.[pmid]
  if (!rec) return null
  const title = rec.title || rec.sorttitle || pmid
  const authors = Array.isArray(rec.authors)
    ? rec.authors.map((a: any) => [a.name, a.authtype].filter(Boolean)[0])
    : []
  const url = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
  const journal = rec.source || ""
  const year = (rec.pubdate || "").match(/\b(\d{4})\b/)?.[1] || null
  return { id: `PMID:${pmid}`, title, authors, url, journal, year, pubmedUrl: url }
}

async function searchPubMedByDOI(doi: string) {
  const r = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&term=${encodeURIComponent(doi)}`,
  )
  if (!r.ok) return null
  const j = await r.json()
  const id = j?.esearchresult?.idlist?.[0]
  return id ? `https://pubmed.ncbi.nlm.nih.gov/${id}/` : null
}

async function searchPubMedByTitle(title: string, year?: number | null) {
  if (!title) return null
  const term = `${title} [Title]${year ? ` AND ${year} [dp]` : ""}`
  const r = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&term=${encodeURIComponent(term)}`,
  )
  if (!r.ok) return null
  const j = await r.json()
  const id = j?.esearchresult?.idlist?.[0]
  return id ? `https://pubmed.ncbi.nlm.nih.gov/${id}/` : null
}

export async function POST(req: Request) {
  const { references } = await req.json()
  const refs: string[] = Array.isArray(references) ? references : []
  const items = await Promise.all(
    refs.map(async (raw) => {
      const doi = extractDoi(raw)
      if (doi) {
        const meta = await fetchCrossref(doi).catch(() => null)
        let pubmedUrl = await searchPubMedByDOI(doi).catch(() => null)
        if (!pubmedUrl && meta) {
          pubmedUrl = await searchPubMedByTitle(meta.title, meta.year as number).catch(() => null)
        }
        if (meta) {
          return { ...meta, pubmedUrl: pubmedUrl || undefined }
        }
      }
      const pmid = extractPmid(raw)
      if (pmid) {
        const meta = await fetchPubMed(pmid).catch(() => null)
        if (meta) return meta
      }
      return { id: raw, title: raw, authors: [], url: raw, journal: "", year: null }
    }),
  )
  return NextResponse.json({ items })
}

