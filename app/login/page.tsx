"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Loader2, LogIn, Mail, Github, Linkedin } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/")
    })
  }, [router])

  const handleLogin = async () => {
    if (!email || !password) return
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    router.replace("/")
  }

  const handleResend = async () => {
    setResending(true)
    setInfo(null)
    try {
      // reenviar e-mail de confirmação de cadastro
      const { error } = await supabase.auth.resend({ type: "signup", email })
      if (error) {
        setError(error.message)
      } else {
        setInfo("Link de confirmação reenviado. Verifique sua caixa de entrada e spam.")
      }
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="container mx-auto max-w-md">
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <LogIn className="h-5 w-5 text-blue-400" />
              Entrar
            </CardTitle>
            <CardDescription className="text-slate-400">Acesse com seu e-mail e senha</CardDescription>
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
              {error && (
                <div className="space-y-2">
                  <p className="text-red-300 text-sm">{error}</p>
                  {error.toLowerCase().includes("not confirmed") ? (
                    <div className="text-slate-300 text-xs">
                      E-mail não confirmado. Verifique o e-mail cadastrado e clique no link de confirmação enviado para ativar sua conta. Não recebeu? Confira a pasta de spam ou solicite o reenvio.
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          className="border-slate-600 text-slate-300"
                          onClick={handleResend}
                          disabled={resending || !email}
                        >
                          {resending ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                              Reenviando...
                            </>
                          ) : (
                            <>
                              <Mail className="h-3 w-3 mr-2" />
                              Reenviar confirmação
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
              {info && <p className="text-emerald-300 text-xs">{info}</p>}
              <Button
                onClick={handleLogin}
                disabled={loading || !email || !password}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>Entrar</>
                )}
              </Button>
              <p className="text-slate-400 text-sm text-center">
                Novo por aqui? <Link href="/signup" className="text-blue-400 hover:text-blue-300">Cadastre-se</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="mt-10 flex items-center justify-center gap-4 text-slate-300">
        <span className="text-sm">Desenvolvedor</span>
        <a
          href="https://github.com/LeandroCostaeSilva"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 hover:text-blue-400"
        >
          <Github className="h-4 w-4" />
          <span className="text-sm">GitHub</span>
        </a>
        <a
          href="https://www.linkedin.com/public-profile/settings?trk=d_flagship3_profile_self_view_public_profile"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 hover:text-blue-400"
        >
          <Linkedin className="h-4 w-4" />
          <span className="text-sm">LinkedIn</span>
        </a>
      </div>
    </div>
  )
}
