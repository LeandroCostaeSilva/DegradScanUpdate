import { getOpenRouterApiKey, getOpenRouterModel } from "./env"

interface DegradationProduct {
  substance: string
  degradationRoute: string
  environmentalConditions: string
  toxicityData: string
}

interface DegradationReport {
  products: DegradationProduct[]
  references: string[]
}

function buildPrompt(substanceName: string): string {
  return `Como um especialista em química analítica sênior, faça uma busca científica profunda sobre os produtos de degradação da ${substanceName}. Liste detalhadamente os produtos formados, a via de degradação, condições ambientais e dados de toxicidade reportados.

Requisitos:
- Liste pelo menos 8 produtos distintos, podendo chegar a 12 se houver evidências.
- Priorize referências com DOI, PMID ou fonte indexada (PubMed, Reaxys, SciFinder, ICH, USP).
- Não inclua comentários nem markdown; responda somente JSON válido.

Formato da resposta:
{
  "products": [
    {
      "substance": "nome da substância formada",
      "degradationRoute": "via de degradação química",
      "environmentalConditions": "condições ambientais que favorecem",
      "toxicityData": "dados de toxicidade relatados"
    }
  ],
  "references": [
    "referência 1 (DOI/PMID/URL)",
    "referência 2 (DOI/PMID/URL)"
  ]
}`
}

function buildExpansionPrompt(substanceName: string, existingNames: string[]): string {
  const blacklist = existingNames.map((n) => `- ${n}`).join("\n")
  return `Adicione mais produtos de degradação para ${substanceName} que não estejam na lista abaixo. Mantenha o mesmo formato JSON e não repita itens. Liste pelo menos 6 novos produtos.

Lista a evitar:
${blacklist}

Formato:
{
  "products": [
    {
      "substance": "...",
      "degradationRoute": "...",
      "environmentalConditions": "...",
      "toxicityData": "..."
    }
  ],
  "references": ["..."]
}`
}

export async function fetchOpenRouterReport(substanceName: string): Promise<DegradationReport> {
  const apiKey = getOpenRouterApiKey()
  if (!apiKey) {
    throw new Error("OPEN_ROUTER_API_KEY ausente")
  }

  const model = getOpenRouterModel()
  const body = {
    model,
    messages: [
      {
        role: "system",
        content:
          "Você é um especialista em química analítica. Responda somente em JSON válido conforme solicitado.",
      },
      { role: "user", content: buildPrompt(substanceName) },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
    max_tokens: 4000,
  }

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000/",
      "X-Title": "DegradScan",
    },
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => "")
    throw new Error(`OpenRouter erro ${resp.status}: ${text}`)
  }

  const data = await resp.json()
  const content =
    data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.message?.content?.[0]?.text ||
    ""

  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) {
    return JSON.parse(fenced[1].trim())
  }
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0])
  }
  return JSON.parse(content)
}

function mergeReports(base: DegradationReport, extra: DegradationReport): DegradationReport {
  const seen = new Set(base.products.map((p) => JSON.stringify(p)))
  const mergedProducts = [...base.products]
  for (const p of extra.products) {
    const key = JSON.stringify(p)
    if (!seen.has(key)) {
      seen.add(key)
      mergedProducts.push(p)
    }
  }
  const refs = new Set([...(base.references || []), ...(extra.references || [])])
  return { products: mergedProducts, references: Array.from(refs) }
}

export async function fetchOpenRouterReportDeep(substanceName: string): Promise<DegradationReport> {
  const first = await fetchOpenRouterReport(substanceName)
  if ((first.products || []).length >= 8) return first
  const existingNames = (first.products || []).map((p) => p.substance).filter(Boolean)

  const apiKey = getOpenRouterApiKey()
  const model = getOpenRouterModel()
  const body = {
    model,
    messages: [
      { role: "system", content: "Responda somente em JSON válido." },
      { role: "user", content: buildExpansionPrompt(substanceName, existingNames) },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
    max_tokens: 4000,
  }
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "HTTP-Referer": "http://localhost:3000/",
      "X-Title": "DegradScan",
    },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    return first
  }
  const data = await resp.json()
  const content =
    data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.message?.content?.[0]?.text ||
    ""
  let second: DegradationReport
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) {
    second = JSON.parse(fenced[1].trim())
  } else {
    const jm = content.match(/\{[\s\S]*\}/)
    second = jm ? JSON.parse(jm[0]) : JSON.parse(content)
  }
  return mergeReports(first, second)
}

