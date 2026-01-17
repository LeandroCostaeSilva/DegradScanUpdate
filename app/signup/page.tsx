"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Loader2, UserPlus } from "lucide-react"

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSignup = async () => {
    if (!email || !password || password !== confirm) {
      setError(password !== confirm ? "Senhas não coincidem" : "Preencha email e senha")
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(null)
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setSuccess("Cadastro realizado com sucesso.")
    
    // Se o Supabase retornar sessão imediatamente (email confirmation desativado), redirecionar direto para home
    if (data.session) {
      setTimeout(() => router.replace("/"), 1500)
    } else {
      setTimeout(() => router.replace("/login"), 1500)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="container mx-auto max-w-md">
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-400" />
              Criar conta
            </CardTitle>
            <CardDescription className="text-slate-400">Cadastre-se com e-mail e senha</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-900/50 border-slate-600 text-slate-100"
              />
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-900/50 border-slate-600 text-slate-100"
              />
              <Input
                type="password"
                placeholder="Confirmar senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="bg-slate-900/50 border-slate-600 text-slate-100"
              />
              {error && <p className="text-red-300 text-sm">{error}</p>}
              {success && <p className="text-emerald-300 text-sm">{success}</p>}
              <Button
                onClick={handleSignup}
                disabled={loading || !email || !password || !confirm}
                className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  <>Cadastrar</>
                )}
              </Button>
              <p className="text-slate-400 text-sm text-center">
                Já possui conta? <Link href="/login" className="text-blue-400 hover:text-blue-300">Entrar</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
