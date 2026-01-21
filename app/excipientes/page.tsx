"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Beaker, Search, AlertCircle } from "lucide-react"
import { getExcipients } from "@/app/actions/get-excipients"
import { ExcipientReport } from "@/lib/openrouter-excipients"

export default function ExcipientesPage() {
  const sp = useSearchParams()
  const initialName = sp.get("name") || ""
  const [name, setName] = useState(initialName)
  const [isLoading, setIsLoading] = useState(false)
  const [report, setReport] = useState<ExcipientReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialName) handleFetch(initialName)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFetch = async (term: string) => {
    const q = term.trim()
    if (!q) return
    setIsLoading(true)
    setError(null)
    setReport(null)
    try {
      const data = await getExcipients(q)
      if (data.excipients.length === 0 && data.references[0]?.includes("Erro")) {
        throw new Error(data.references[0])
      }
      setReport(data)
    } catch (e: any) {
      setError(e?.message || "Erro ao buscar excipientes")
    } finally {
      setIsLoading(false)
    }
  }

  const groupExcipients = (excipients: any[]) => {
    const groups: Record<string, any[]> = {}
    excipients.forEach(exc => {
      const func = exc.function || "Outros"
      if (!groups[func]) groups[func] = []
      groups[func].push(exc)
    })
    return groups
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="container mx-auto">
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent mb-2">
            Excipientes e Adjuvantes Farmacotécnicos
          </h1>
          <p className="text-slate-300">Pesquisa de formulações associadas via IA</p>
        </div>

        <Card className="mb-8 bg-slate-800/50 border-slate-700/50 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Search className="h-5 w-5 text-purple-400" />
              </div>
              Pesquisar Substância Ativa
            </CardTitle>
            <CardDescription className="text-slate-400">Informe o fármaco para identificar excipientes compatíveis e comuns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Ex: Paracetamol, Ibuprofeno..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20"
                onKeyDown={(e) => e.key === 'Enter' && handleFetch(name)}
              />
              <Button
                onClick={() => handleFetch(name)}
                disabled={isLoading || !name.trim()}
                className="px-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Pesquisando...
                  </>
                ) : (
                  <>
                    <Beaker className="h-4 w-4 mr-2" />
                    Pesquisar
                  </>
                )}
              </Button>
            </div>
            {error && (
              <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-300">
                <AlertCircle className="h-5 w-5" />
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {report && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {Object.entries(groupExcipients(report.excipients)).map(([func, items], idx) => (
              <Card key={idx} className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="bg-slate-800/80 border-b border-slate-700/50">
                  <CardTitle className="text-slate-100 flex items-center gap-2 text-lg">
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30">
                      {func}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-900/30 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          <th className="px-6 py-3">Excipiente</th>
                          <th className="px-6 py-3">Concentração Usual</th>
                          <th className="px-6 py-3">Notas de Compatibilidade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/30">
                        {items.map((item, i) => (
                          <tr key={i} className="hover:bg-slate-700/20 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-slate-200 font-medium">{item.name}</td>
                            <td className="px-6 py-4 text-slate-300 text-sm">{item.commonConcentration}</td>
                            <td className="px-6 py-4 text-slate-400 text-sm italic">{item.compatibilityNotes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card className="bg-slate-800/30 border-slate-700/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-200 text-lg">Referências Bibliográficas</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-2 text-slate-400 text-sm">
                  {report.references.map((ref, i) => (
                    <li key={i}>{ref}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
