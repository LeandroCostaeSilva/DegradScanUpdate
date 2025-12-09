"use server"

import { supabaseServer } from "@/lib/supabase-server"
import { getOpenRouterApiKey, getForceAI } from "@/lib/env"
import { fetchOpenRouterReportDeep } from "@/lib/openrouter"
import { headers } from "next/headers"

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

export async function generateDegradationReportDefinitive(substanceName: string): Promise<DegradationReport> {
  const startTime = Date.now()
  const headersList = headers()
  const userAgent = headersList.get("user-agent") || ""
  const forwardedFor = headersList.get("x-forwarded-for")
  const userIP = forwardedFor ? forwardedFor.split(",")[0] : headersList.get("x-real-ip") || "unknown"

  console.log(`🔍 [SEARCH] Iniciando pesquisa para: ${substanceName}`)

  try {
    const forceAI = getForceAI()

    if (forceAI && getOpenRouterApiKey()) {
      console.log(`🧠 [AI] Forçando consulta OpenRouter (ignorando cache/banco)...`)
      const report = await generateReportFromAI(substanceName)
      const cacheKey = `substance_${substanceName.toLowerCase().replace(/\s+/g, "_")}`
      await saveDataDefinitive(substanceName, report, "openrouter")
      await setCacheDefinitive(cacheKey, substanceName, report, "openrouter")
      await logSearchDefinitive(substanceName, userIP, userAgent, "openrouter", false)
      console.log(`✅ [SUCCESS] Pesquisa concluída (forçada via OpenRouter)`)
      return report
    }

    // 1. VERIFICAR CACHE PRIMEIRO (PRIORIDADE MÁXIMA)
    const cacheKey = `substance_${substanceName.toLowerCase().replace(/\s+/g, "_")}`
    console.log(`🔍 [CACHE] Verificando cache para chave: ${cacheKey}`)

    const cachedData = await checkCacheDefinitive(cacheKey)

    if (cachedData) {
      const processingTime = Date.now() - startTime
      console.log(`✅ [CACHE] HIT! Dados encontrados no cache (${processingTime}ms)`)

      // Registrar como cache hit
      await logSearchDefinitive(substanceName, userIP, userAgent, "cache", true)

      return cachedData
    }

    console.log(`❌ [CACHE] MISS - Dados não encontrados no cache`)

    // 2. VERIFICAR BANCO DE DADOS
    console.log(`🔍 [DATABASE] Verificando banco de dados...`)
    const existingData = await getSubstanceFromDatabase(substanceName)

    if (existingData) {
      const processingTime = Date.now() - startTime
      console.log(`✅ [DATABASE] Dados encontrados no banco (${processingTime}ms)`)

      // Salvar no cache para próximas consultas
      await setCacheDefinitive(cacheKey, substanceName, existingData, "database")

      // Registrar como database hit
      await logSearchDefinitive(substanceName, userIP, userAgent, "database", false)

      return existingData
    }

    console.log(`❌ [DATABASE] Dados não encontrados no banco`)

    // 3. GERAR NOVO RELATÓRIO
    let report: DegradationReport
    let responseSource: string

    if (getOpenRouterApiKey()) {
      console.log(`🧠 [AI] Consultando OpenRouter...`)
      report = await generateReportFromAI(substanceName)
      responseSource = "openrouter"
    } else {
      console.log(`📋 [MOCK] Usando dados mock (API key não disponível)`)
      report = getMockData(substanceName)
      responseSource = "mock"
    }

    const processingTime = Date.now() - startTime

    // 4. SALVAR TUDO (BANCO + CACHE)
    console.log(`💾 [SAVE] Salvando dados...`)

    // Salvar no banco
    await saveDataDefinitive(substanceName, report, responseSource)

    // Salvar no cache
    await setCacheDefinitive(cacheKey, substanceName, report, responseSource)

    // Registrar pesquisa
    await logSearchDefinitive(substanceName, userIP, userAgent, responseSource, false)

    console.log(`✅ [SUCCESS] Pesquisa concluída (${processingTime}ms)`)
    return report
  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error(`❌ [ERROR] Erro na pesquisa (${processingTime}ms):`, error)

    // Registrar erro (com try-catch para não quebrar se log falhar)
    try {
      await logSearchDefinitive(substanceName, userIP, userAgent, "error", false)
    } catch (logError) {
      console.error("❌ [ERROR] Erro ao registrar log:", logError)
    }

    // Retornar mock como fallback
    return getMockData(substanceName)
  }
}

// FUNÇÕES AUXILIARES DEFINITIVAS (COM TRATAMENTO DE ERRO ROBUSTO)

async function checkCacheDefinitive(cacheKey: string): Promise<DegradationReport | null> {
  try {
    const { data, error } = await supabaseServer.rpc("get_cache_data", {
      p_cache_key: cacheKey,
    })

    if (error) {
      console.error("❌ [CACHE] Erro ao verificar cache:", error)
      return null
    }

    if (!data) {
      return null
    }

    // Validar estrutura dos dados
    if (data.products && data.references) {
      return {
        products: data.products,
        references: data.references,
      }
    }

    return null
  } catch (error) {
    console.error("❌ [CACHE] Erro na verificação de cache:", error)
    return null
  }
}

async function setCacheDefinitive(
  cacheKey: string,
  substanceName: string,
  data: DegradationReport,
  source: string,
): Promise<void> {
  try {
    const { data: result, error } = await supabaseServer.rpc("set_cache_data", {
      p_cache_key: cacheKey,
      p_substance_name: substanceName,
      p_data: data,
      p_source: source,
    })

    if (error) {
      console.error("❌ [CACHE] Erro ao salvar cache:", error)
    } else {
      console.log(`✅ [CACHE] Dados salvos no cache: ${cacheKey} (resultado: ${result})`)
    }
  } catch (error) {
    console.error("❌ [CACHE] Erro ao salvar cache:", error)
  }
}

async function logSearchDefinitive(
  substanceName: string,
  userIP: string,
  userAgent: string,
  responseSource: string,
  wasCached: boolean,
): Promise<void> {
  try {
    const { error } = await supabaseServer.rpc("log_search_simple", {
      substance_name: substanceName.toLowerCase(),
      search_term: substanceName,
      user_ip: userIP,
      user_agent: userAgent,
      response_source: responseSource,
      was_cached: wasCached,
    })

    if (error) {
      console.error("❌ [LOG] Erro ao registrar pesquisa:", error)
    } else {
      console.log(`✅ [LOG] Pesquisa registrada: ${substanceName} (${responseSource}, cached: ${wasCached})`)
    }
  } catch (error) {
    console.error("❌ [LOG] Erro ao registrar pesquisa:", error)
  }
}

async function saveDataDefinitive(
  substanceName: string,
  report: DegradationReport,
  responseSource: string,
): Promise<void> {
  try {
    const { error } = await supabaseServer.rpc("save_data_simple", {
      substance_name: substanceName.toLowerCase(),
      products: report.products,
      references_list: report.references,
      response_source: responseSource,
    })

    if (error) {
      console.error("❌ [DATABASE] Erro ao salvar dados:", error)
    } else {
      console.log(`✅ [DATABASE] Dados salvos: ${substanceName}`)
    }
  } catch (error) {
    console.error("❌ [DATABASE] Erro ao salvar dados:", error)
  }
}

async function getSubstanceFromDatabase(substanceName: string): Promise<DegradationReport | null> {
  try {
    const { data, error } = await supabaseServer.rpc("get_substance_data", {
      substance_name: substanceName,
    })

    if (error) {
      console.error("❌ [DATABASE] Erro ao buscar dados:", error)
      return null
    }

    if (!data) {
      return null
    }

    return {
      products: data.products || [],
      references: data.references || [],
    }
  } catch (error) {
    console.error("❌ [DATABASE] Erro na consulta:", error)
    return null
  }
}

async function generateReportFromAI(substanceName: string): Promise<DegradationReport> {
  const result = await fetchOpenRouterReportDeep(substanceName)
  return result
}

function getMockData(substanceName: string): DegradationReport {
  const mockReports: Record<string, DegradationReport> = {
    paracetamol: {
      products: [
        {
          substance: "N-acetil-p-benzoquinona imina (NAPQI)",
          degradationRoute: "Oxidação metabólica via CYP2E1",
          environmentalConditions: "pH fisiológico, presença de oxigênio, temperatura corporal (37°C)",
          toxicityData: "Altamente hepatotóxico, responsável pela toxicidade do paracetamol em overdose",
        },
        {
          substance: "p-aminofenol",
          degradationRoute: "Hidrólise da ligação amida",
          environmentalConditions: "pH ácido (< 4), temperatura elevada (> 60°C), umidade alta",
          toxicityData: "Moderadamente tóxico, pode causar metahemoglobinemia e nefrotoxicidade",
        },
        {
          substance: "Ácido p-hidroxibenzóico",
          degradationRoute: "Oxidação do grupo amino seguida de desaminação",
          environmentalConditions: "Presença de oxidantes, luz UV, pH alcalino (> 8)",
          toxicityData: "Baixa toxicidade, usado como conservante alimentar (E-214)",
        },
      ],
      references: [
        "Larson, A. M., et al. (2005). Acetaminophen-induced acute liver failure: results of a United States multicenter, prospective study. Hepatology, 42(6), 1364-1372.",
        "McGill, M. R., & Jaeschke, H. (2013). Metabolism and disposition of acetaminophen: recent advances in relation to hepatotoxicity and diagnosis. Pharmaceutical research, 30(9), 2174-2187.",
        "Prescott, L. F. (2000). Paracetamol, alcohol and the liver. British journal of clinical pharmacology, 49(4), 291-301.",
        "Dahlin, D. C., et al. (1984). N-acetyl-p-benzoquinone imine: a cytochrome P-450-mediated oxidation product of acetaminophen. Proceedings of the National Academy of Sciences, 81(5), 1327-1331.",
      ],
    },
    ibuprofeno: {
      products: [
        {
          substance: "Ácido 2-[4-(2-carboxipropil)fenil]propiônico",
          degradationRoute: "Oxidação da cadeia lateral isobutílica",
          environmentalConditions: "pH neutro (6-8), presença de oxigênio, catálise enzimática (CYP2C9)",
          toxicityData: "Toxicidade renal moderada, menor nefrotoxicidade que o composto original",
        },
        {
          substance: "4-isobutilfenol",
          degradationRoute: "Descarboxilação térmica",
          environmentalConditions: "Temperatura elevada (> 80°C), pH ácido (< 3), ausência de água",
          toxicityData: "Potencial irritante dérmico e ocular, dados limitados de toxicidade sistêmica",
        },
        {
          substance: "Ácido 2-[4-(1-hidroxi-2-metilpropil)fenil]propiônico",
          degradationRoute: "Hidroxilação da cadeia lateral",
          environmentalConditions: "Presença de enzimas CYP, pH fisiológico, temperatura corporal",
          toxicityData: "Perfil de toxicidade similar ao ibuprofeno, menor atividade anti-inflamatória",
        },
      ],
      references: [
        "Davies, N. M. (1998). Clinical pharmacokinetics of ibuprofen. Clinical pharmacokinetics, 34(2), 101-154.",
        "Rainsford, K. D. (2009). Ibuprofen: pharmacology, efficacy and safety. Inflammopharmacology, 17(6), 275-342.",
        "Mazaleuskaya, L. L., et al. (2015). PharmGKB summary: ibuprofen pathways. Pharmacogenetics and genomics, 25(2), 96-106.",
      ],
    },
  }

  const key = substanceName.toLowerCase()
  const report = mockReports[key]

  if (report) {
    return report
  }

  // Generic response for unknown substances
  return {
    products: [
      {
        substance: `Produtos de degradação de ${substanceName}`,
        degradationRoute: "Múltiplas vias de degradação possíveis (hidrólise, oxidação, fotólise)",
        environmentalConditions: "Variáveis conforme condições específicas (pH, temperatura, luz, oxigênio)",
        toxicityData: "Dados de toxicidade específicos requerem análise detalhada da literatura científica",
      },
    ],
    references: [
      "Para informações específicas sobre produtos de degradação, consulte bases de dados especializadas como PubMed, SciFinder ou Reaxys.",
      "Diretrizes ICH Q1A(R2) - Stability Testing of New Drug Substances and Products.",
      "USP <1225> Validation of Compendial Procedures - Analytical validation guidelines.",
    ],
  }
}

function parseTextResponse(text: string, substanceName: string): DegradationReport {
  // This is a fallback parser for when the AI doesn't return proper JSON
  const lines = text.split("\n").filter((line) => line.trim())

  const products: DegradationProduct[] = []
  const references: string[] = []

  let inReferences = false

  for (const line of lines) {
    if (line.toLowerCase().includes("referência") || line.toLowerCase().includes("bibliografia")) {
      inReferences = true
      continue
    }

    if (inReferences) {
      if (line.trim() && !line.includes("|")) {
        references.push(line.trim())
      }
    } else if (line.includes("|") && !line.includes("Produto") && !line.includes("---")) {
      // Parse table rows
      const columns = line
        .split("|")
        .map((col) => col.trim())
        .filter((col) => col)
      if (columns.length >= 4) {
        products.push({
          substance: columns[0] || "Não especificado",
          degradationRoute: columns[1] || "Não especificado",
          environmentalConditions: columns[2] || "Não especificado",
          toxicityData: columns[3] || "Não especificado",
        })
      }
    }
  }

  // If no products were parsed, return mock data
  if (products.length === 0) {
    return getMockData(substanceName)
  }

  if (references.length === 0) {
    references.push(
      "Consulte literatura científica especializada para informações detalhadas sobre produtos de degradação.",
    )
  }

  return { products, references }
}
