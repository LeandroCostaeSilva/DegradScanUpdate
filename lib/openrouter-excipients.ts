import { getOpenRouterApiKey, getOpenRouterModel } from "./env"

export interface Excipient {
  name: string
  function: string
  commonConcentration: string
  compatibilityNotes: string
}

export interface ExcipientReport {
  excipients: Excipient[]
  references: string[]
}

function buildExcipientPrompt(substanceName: string): string {
  return `Como um especialista em tecnologia farmacêutica e farmacotécnica, liste os excipientes e adjuvantes farmacêuticos mais comuns utilizados em formulações contendo o fármaco ${substanceName}.
  
Requisitos:
- Liste pelo menos 10 excipientes comuns associados a este fármaco em diferentes formas farmacêuticas (comprimidos, cápsulas, suspensões, etc.).
- Categorize pela função principal (Ex: Diluente, Aglutinante, Desintegrante, Lubrificante, Conservante, etc.).
- Inclua notas sobre compatibilidade ou incompatibilidade conhecidas com o fármaco ${substanceName}, se houver.
- Priorize referências com DOI, PMID ou manuais farmacêuticos (Handbook of Pharmaceutical Excipients, Martindale, etc.).
- Não inclua comentários nem markdown; responda somente JSON válido.

Formato da resposta:
{
  "excipients": [
    {
      "name": "nome do excipiente",
      "function": "função (ex: Aglutinante)",
      "commonConcentration": "faixa de concentração usual (ex: 2-5%)",
      "compatibilityNotes": "notas sobre compatibilidade/estabilidade"
    }
  ],
  "references": [
    "referência 1",
    "referência 2"
  ]
}`
}

export async function fetchOpenRouterExcipients(substanceName: string): Promise<ExcipientReport> {
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
          "Você é um especialista em tecnologia farmacêutica. Responda somente em JSON válido conforme solicitado.",
      },
      { role: "user", content: buildExcipientPrompt(substanceName) },
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
