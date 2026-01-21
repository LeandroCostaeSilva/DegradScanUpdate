"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Search, Download, FileText, Loader2, Sparkles, Zap } from "lucide-react"
import { MoleculeLogo } from "./components/MoleculeLogo"
import { supabase } from "@/lib/supabase"
import { generateDegradationReportDefinitive } from "./actions/generate-report-definitive"
import { generatePDF } from "./utils/pdf-generator"
import Link from "next/link"
import { useRouter } from "next/navigation"

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

export default function DegradScanApp() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [report, setReport] = useState<DegradationReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cacheStatus, setCacheStatus] = useState<string | null>(null)
  const [isPdfGenerating, setIsPdfGenerating] = useState(false)
  const [refMeta, setRefMeta] = useState<{ [key: number]: { title: string; authors: string[]; url: string; journal?: string; year?: number | string; pubmedUrl?: string } }>({})
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>("")
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const resultsRef = useRef<HTMLDivElement | null>(null)

  const handleSearch = async () => {
    const term = selectedSuggestion || searchTerm
    if (!term.trim()) return

    setIsLoading(true)
    setError(null)
    setCacheStatus(null)

    const startTime = Date.now()

    try {
      const result = await generateDegradationReportDefinitive(term)
      const processingTime = Date.now() - startTime

      setReport(result)
      setCacheStatus(`Processado em ${processingTime}ms`)
      try {
        const r = await fetch("/api/refmeta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ references: result.references }),
        })
        const j = await r.json()
        const items = Array.isArray(j.items) ? j.items : []
        const mapObj = Object.fromEntries(
          items.map((it: any, i: number) => [
            i,
            {
              title: it.title || result.references[i],
              authors: it.authors || [],
              url: it.url || "",
              journal: it.journal || "",
              year: it.year || "",
              pubmedUrl: it.pubmedUrl || "",
            },
          ]),
        ) as any
        setRefMeta(mapObj)
      } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar relatório. Tente novamente.")
      console.error("Error generating report:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!report) return

    setIsPdfGenerating(true)

    try {
      await generatePDF(searchTerm, report)
    } catch (error) {
      console.error("Erro ao gerar PDF:", error)
      setError("Erro ao gerar PDF. Tente novamente.")
    } finally {
      setIsPdfGenerating(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const normalize = (s: string) => s.toLowerCase().trim()
  const getRefIndexForProduct = (product: DegradationProduct, refs: string[], fallbackIndex: number) => {
    if (!refs || refs.length === 0) return null
    const pSub = normalize(product.substance)
    const pTox = normalize(product.toxicityData)
    const foundIdx = refs.findIndex((r) => {
      const nr = normalize(r)
      return nr.includes(pSub) || (pTox.length > 0 && nr.includes(pTox.slice(0, Math.min(24, pTox.length))))
    })
    if (foundIdx !== -1) return foundIdx + 1
    const fi = Math.min(fallbackIndex, refs.length - 1)
    return fi >= 0 ? fi + 1 : null
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email || null)
      if (!data.session) {
        router.replace("/login")
      }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user?.email || null)
      if (!session) {
        router.replace("/login")
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUserEmail(null)
    router.replace("/login")
  }
  useEffect(() => {
    if (report && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [report])
  useEffect(() => {
    const controller = new AbortController()
    const run = async () => {
      const q = searchTerm.trim()
      if (q.length < 2) {
        setSuggestions([])
        return
      }
      try {
        setSuggestionsLoading(true)
        const resp = await fetch(`/api/pubchem-autocomplete?type=compound&q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        })
        const data = await resp.json()
        setSuggestions(Array.isArray(data.items) ? data.items.slice(0, 10) : [])
      } catch {
        setSuggestions([])
      } finally {
        setSuggestionsLoading(false)
      }
    }
    const t = setTimeout(run, 250)
    return () => {
      clearTimeout(t)
      controller.abort()
    }
  }, [searchTerm])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%239C92AC' fillOpacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12 relative">
          <div className="flex items-center justify-center gap-4 mb-6">
            <MoleculeLogo />
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
                DegradScan
              </h1>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-slate-400 font-medium">Powered by AI</span>
                <Zap className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-slate-400 font-medium">Cache Inteligente</span>
              </div>
            </div>
          </div>

          <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed mb-6">
            Ferramenta especializada para pesquisa de produtos de degradação de substâncias ativas de medicamentos
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30">
              Química Analítica
            </Badge>
            <Badge
              variant="secondary"
              className="bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30"
            >
              Ciências Farmacêuticas
            </Badge>
            <Badge
              variant="secondary"
              className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
            >
              Controle de Qualidade
            </Badge>
            <Badge
              variant="secondary"
              className="bg-orange-500/20 text-orange-300 border-orange-500/30 hover:bg-orange-500/30"
            >
              P&D Farmacêutico
            </Badge>
          </div>
          <div className="md:absolute md:right-0 md:top-0 flex items-center gap-3 mt-4 md:mt-0 justify-center">
            {userEmail ? (
              <>
                <span className="text-slate-400 text-sm max-w-[50vw] truncate">{userEmail}</span>
                <Button variant="outline" className="border-slate-600 text-slate-300 w-auto" onClick={handleLogout}>Sair</Button>
              </>
            ) : (
              <Link href="/login" className="text-blue-400 hover:text-blue-300 text-sm">Entrar</Link>
            )}
          </div>
        </div>

        {/* Search Section */}
        <Card className="mb-8 bg-slate-800/50 border-slate-700/50 backdrop-blur-sm shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-slate-100">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Search className="h-5 w-5 text-blue-400" />
              </div>
              Busca por Substância Ativa
              {cacheStatus && (
                <Badge variant="outline" className="border-emerald-500 text-emerald-300 ml-auto">
                  <Zap className="h-3 w-3 mr-1" />
                  {cacheStatus}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-slate-400">
              Digite o nome do fármaco conforme DCB ou o nome da substância conforme CAS Number
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Input
                placeholder="Ex: Paracetamol, Ibuprofeno, Ácido Acetilsalicílico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 w-full bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                disabled={isLoading}
              />
              <Button
                onClick={handleSearch}
                disabled={isLoading || !(selectedSuggestion || searchTerm.trim())}
                className="px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg w-full sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Pesquisar
                  </>
                )}
              </Button>
            </div>
            {/* Autocomplete suggestions */}
            {suggestionsLoading && (
              <p className="mt-3 text-xs text-slate-400">Consultando PubChem…</p>
            )}
            {suggestions.length > 0 && (
              <div className="mt-4 rounded-lg border border-slate-700/50 bg-slate-900/40">
                <div className="px-4 py-2 text-xs text-slate-400">Sugestões (PubChem)</div>
                <ul className="max-h-48 overflow-auto divide-y divide-slate-700/40">
                  {suggestions.map((s, i) => {
                    const checked = selectedSuggestion.toLowerCase() === s.toLowerCase()
                    return (
                      <li key={i} className="flex items-center gap-3 px-4 py-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSuggestion(s)
                              setSearchTerm(s)
                            } else {
                              setSelectedSuggestion("")
                            }
                          }}
                          className="accent-blue-500"
                        />
                        <button
                          type="button"
                          className="text-slate-200 text-sm hover:text-blue-400"
                          onClick={() => {
                            setSelectedSuggestion(s)
                            setSearchTerm(s)
                          }}
                        >
                          {s}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="mb-8 bg-red-900/20 border-red-500/30 backdrop-blur-sm">
            <CardContent className="pt-6">
              <p className="text-red-300 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                {error}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {report && (
          <div ref={resultsRef} id="results">
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm shadow-2xl">
            <CardHeader className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div>
                <CardTitle className="flex items-center gap-3 text-slate-100">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <FileText className="h-5 w-5 text-emerald-400" />
                  </div>
                  Relatório de Degradação - {searchTerm}
                </CardTitle>
                <CardDescription className="text-slate-400 mt-1">
                  Produtos de degradação identificados e suas características
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto">
                <Button
                  onClick={handleDownloadPDF}
                  disabled={isPdfGenerating}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white bg-transparent w-full sm:w-auto"
                >
                  {isPdfGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Gerar PDF
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white bg-transparent w-full sm:w-auto"
                  asChild
                >
                  <Link
                    href={`/propriedades?name=${encodeURIComponent(selectedSuggestion || searchTerm || "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    prefetch={false}
                  >
                    Gerar dados físico-químicos
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20 hover:text-purple-200 bg-transparent w-full sm:w-auto"
                  asChild
                >
                  <Link
                    href={`/excipientes?name=${encodeURIComponent(selectedSuggestion || searchTerm || "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    prefetch={false}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Excipientes
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto mb-8 rounded-lg border border-slate-700">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-700/50">
                      <th className="border-b border-slate-600 px-6 py-4 text-left font-semibold text-slate-200">
                        Produto de Degradação
                      </th>
                      <th className="border-b border-slate-600 px-6 py-4 text-left font-semibold text-slate-200">
                        Via de Degradação
                      </th>
                      <th className="border-b border-slate-600 px-6 py-4 text-left font-semibold text-slate-200">
                        Condições Ambientais
                      </th>
                      <th className="border-b border-slate-600 px-6 py-4 text-left font-semibold text-slate-200">
                        Dados de Toxicidade
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.products.map((product, index) => {
                      const refIdx = getRefIndexForProduct(product, report.references, index)
                      return (
                        <tr
                          key={index}
                          className={`${
                            index % 2 === 0 ? "bg-slate-800/30" : "bg-slate-800/50"
                          } hover:bg-slate-700/30 transition-colors`}
                        >
                          <td className="border-b border-slate-700/50 px-6 py-4 text-slate-300">{product.substance}</td>
                          <td className="border-b border-slate-700/50 px-6 py-4 text-slate-300">
                            {product.degradationRoute}
                          </td>
                          <td className="border-b border-slate-700/50 px-6 py-4 text-slate-300">
                            {product.environmentalConditions}
                          </td>
                          <td className="border-b border-slate-700/50 px-6 py-4 text-slate-300">
                            {product.toxicityData}
                            {refIdx ? (
                              <a href={`#ref-${refIdx}`}>
                                <sup className="ml-1 text-xs text-blue-400">{refIdx}</sup>
                              </a>
                            ) : null}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <Separator className="my-8 bg-slate-700" />

              <div>
                <h3 className="text-lg font-semibold mb-6 text-slate-100 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  Referências Bibliográficas
                </h3>
                <ol className="list-decimal pl-6 space-y-2">
                  {report.references.map((reference, index) => {
                    const meta = refMeta[index] || {}
                    const title = meta.title || reference
                    const authors = Array.isArray(meta.authors) && meta.authors.length > 0 ? meta.authors.join(", ") : ""
                    const url = meta.url || ""
                    const pubmedUrl = meta.pubmedUrl || ""
                    const journal = meta.journal || ""
                    const year = meta.year ? String(meta.year) : ""

                    const doiMatch = reference.match(/10\.[0-9]{4,9}\/[\-._;()\/:A-Z0-9]+/i)
                    const pmidMatch = reference.match(/pmid\s*:\s*(\d+)/i) || reference.match(/\b(\d{7,8})\b/)
                    const idText = doiMatch ? `DOI: ${doiMatch[0]}` : pmidMatch ? `PMID: ${pmidMatch[1] || pmidMatch[0]}` : ""

                    const showId = idText && idText.toLowerCase() !== (title || "").toLowerCase()

                    return (
                      <li key={index} id={`ref-${index + 1}`} className="leading-relaxed">
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer" className="text-slate-200 hover:text-blue-400 text-sm">
                            {title}
                          </a>
                        ) : (
                          <span className="text-slate-200 text-sm">{title}</span>
                        )}
                        {authors ? <div className="text-slate-400 text-sm">{authors}</div> : null}
                        {(journal || year) ? (
                          <div className="text-slate-500 text-xs">{journal}{journal && year ? ", " : ""}{year}</div>
                        ) : null}
                        {showId ? <div className="text-slate-400 text-xs">{idText}</div> : null}
                        {(pubmedUrl || url) ? (
                          <div className="text-slate-400 text-xs">
                            disponível em: {pubmedUrl ? (
                              <a href={pubmedUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300">{pubmedUrl}</a>
                            ) : (
                              <a href={url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300">{url}</a>
                            )}
                          </div>
                        ) : null}
                      </li>
                    )
                  })}
                </ol>
              </div>
            </CardContent>
          </Card>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/30 rounded-full border border-slate-700/50 backdrop-blur-sm">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <p className="text-sm text-slate-400">
              DegradScan - Sistema com cache inteligente para otimização de performance
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
