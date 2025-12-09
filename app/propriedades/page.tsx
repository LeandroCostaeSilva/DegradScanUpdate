"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, FlaskRound, ListChecks } from "lucide-react"

export default function PropriedadesPage() {
  const sp = useSearchParams()
  const initialName = sp.get("name") || ""
  const [name, setName] = useState(initialName)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<{
    name: string
    cid: number
    properties: Record<string, any>
    synonyms: string[]
  } | null>(null)

  useEffect(() => {
    if (initialName) handleFetch(initialName)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFetch = async (term: string) => {
    const q = term.trim()
    if (!q) return
    setIsLoading(true)
    setError(null)
    try {
      const resp = await fetch(`/api/pubchem-details?name=${encodeURIComponent(q)}`)
      const json = await resp.json()
      if (json.error && json.error !== "cid_not_found") throw new Error(json.error)
      setData(json.error === "cid_not_found" ? { name: q, cid: 0, properties: {}, synonyms: [] } : json)
    } catch (e: any) {
      setError(e?.message || "Erro ao consultar PubChem")
    } finally {
      setIsLoading(false)
    }
  }

  const propEntries = Object.entries(data?.properties || {})
    .filter(([, v]) => v !== undefined && v !== null && String(v).length > 0)
    .map(([k, v]) => ({ key: k, value: v }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="container mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent mb-2">
            Dados Físico-Químicos e Sinônimos
          </h1>
          <p className="text-slate-300">Consulta via PubChem PUG REST</p>
        </div>

        <Card className="mb-8 bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <FlaskRound className="h-5 w-5 text-blue-400" />
              </div>
              Buscar Substância
            </CardTitle>
            <CardDescription className="text-slate-400">Informe o nome químico (exato ou comum)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Ex: Benzene, Metformin, Semaglutide..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
              />
              <Button
                onClick={() => handleFetch(name)}
                disabled={isLoading || !name.trim()}
                className="px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Consultando...
                  </>
                ) : (
                  <>Consultar</>
                )}
              </Button>
            </div>
            {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
          </CardContent>
        </Card>

        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <ListChecks className="h-5 w-5 text-emerald-400" />
                  </div>
                  Propriedades Físico-Químicas
                </CardTitle>
                <CardDescription className="text-slate-400">CID: {data.cid || "não encontrado"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border border-slate-700">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-700/50">
                        <th className="border-b border-slate-600 px-6 py-3 text-left text-slate-200">Atributo</th>
                        <th className="border-b border-slate-600 px-6 py-3 text-left text-slate-200">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {propEntries.length > 0 ? (
                        propEntries.map((p, i) => (
                          <tr key={i} className={i % 2 === 0 ? "bg-slate-800/30" : "bg-slate-800/50"}>
                            <td className="border-b border-slate-700/50 px-6 py-3 text-slate-300">{p.key}</td>
                            <td className="border-b border-slate-700/50 px-6 py-3 text-slate-300">{String(p.value)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="px-6 py-6 text-slate-400 text-center">Sem propriedades disponíveis</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <FlaskRound className="h-5 w-5 text-blue-400" />
                  </div>
                  Sinônimos (PubChem)
                </CardTitle>
                <CardDescription className="text-slate-400">Lista resumida</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 max-h-96 overflow-auto">
                  {(data.synonyms || []).length > 0 ? (
                    data.synonyms.map((s, i) => (
                      <li key={i} className="text-slate-300 text-sm">{s}</li>
                    ))
                  ) : (
                    <li className="text-slate-400 text-sm">Sem sinônimos disponíveis</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

