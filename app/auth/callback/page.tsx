"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function AuthCallbackPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState<string>("Validando confirmação...")

  useEffect(() => {
    const code = sp.get("code")
    if (!code) {
      setStatus("error")
      setMessage("Link inválido ou expirado. Faça login para continuar.")
      return
    }
    ;(async () => {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setStatus("error")
          setMessage("Não foi possível confirmar o e-mail. Faça login para continuar.")
          return
        }
        if (data.session) {
          setStatus("success")
          setMessage("E-mail confirmado com sucesso! Redirecionando...")
          setTimeout(() => router.replace("/"), 1200)
        } else {
          setStatus("success")
          setMessage("E-mail confirmado! Faça login para acessar.")
        }
      } catch {
        setStatus("error")
        setMessage("Falha na confirmação. Acesse sua conta pelo login.")
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="container mx-auto max-w-md">
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100">Confirmação de e-mail</CardTitle>
            <CardDescription className="text-slate-400">Validação de acesso</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-slate-200">
              {status === "loading" && <Loader2 className="h-5 w-5 animate-spin text-blue-400" />}
              {status === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
              {status === "error" && <XCircle className="h-5 w-5 text-red-400" />}
              <span className="text-sm">{message}</span>
            </div>
            {status !== "loading" && (
              <div className="mt-4">
                <Button onClick={() => router.replace(status === "success" ? "/login" : "/login")} className="w-full">
                  Ir para login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

