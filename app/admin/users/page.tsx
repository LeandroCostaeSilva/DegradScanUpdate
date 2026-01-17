"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface UserItem {
  id: string
  email: string | null
  created_at: string
  email_confirmed_at: string | null
  phone: string | null
  last_sign_in_at: string | null
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<UserItem[]>([])

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) {
        router.replace("/login")
        return
      }
      try {
        const r = await fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!r.ok) {
          setError(r.status === 403 ? "Acesso negado" : "Falha ao carregar usuários")
          setLoading(false)
          return
        }
        const j = await r.json()
        setItems(j.items || [])
      } catch (e) {
        setError("Erro de rede")
      } finally {
        setLoading(false)
      }
    })()
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="container mx-auto max-w-4xl">
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100">Usuários (Supabase)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-slate-300">Carregando...</p>
            ) : error ? (
              <p className="text-red-300">{error}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-slate-300">
                  <thead>
                    <tr className="text-left border-b border-slate-700">
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Criado em</th>
                      <th className="py-2 pr-4">Confirmado</th>
                      <th className="py-2 pr-4">Último acesso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((u) => (
                      <tr key={u.id} className="border-b border-slate-800">
                        <td className="py-2 pr-4">{u.email || "—"}</td>
                        <td className="py-2 pr-4">{new Date(u.created_at).toLocaleString()}</td>
                        <td className="py-2 pr-4">{u.email_confirmed_at ? new Date(u.email_confirmed_at).toLocaleString() : "—"}</td>
                        <td className="py-2 pr-4">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4">
              <Button variant="outline" className="border-slate-600 text-slate-300" onClick={() => router.replace("/")}>Voltar</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

