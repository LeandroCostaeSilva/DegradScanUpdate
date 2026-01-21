"use server"

import { fetchOpenRouterExcipients, ExcipientReport } from "@/lib/openrouter-excipients"

export async function getExcipients(substanceName: string): Promise<ExcipientReport> {
  console.log(`🔍 [EXCIPIENTS] Buscando excipientes para: ${substanceName}`)
  try {
    const report = await fetchOpenRouterExcipients(substanceName)
    return report
  } catch (error) {
    console.error("❌ [EXCIPIENTS] Erro ao buscar excipientes:", error)
    // Fallback básico em caso de erro
    return {
      excipients: [],
      references: ["Erro ao consultar serviço de inteligência artificial. Tente novamente."]
    }
  }
}
