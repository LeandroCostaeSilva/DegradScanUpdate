"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Loader2, LogIn, Mail, Github, Linkedin, Sparkles, Zap } from "lucide-react"
import { MoleculeLogo } from "../components/MoleculeLogo"

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
    let errorMsg: string | null = null
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) errorMsg = error.message
    } catch (e: any) {
      errorMsg = "Serviço de autenticação indisponível. Tente novamente em alguns instantes."
    }
    setLoading(false)
    if (errorMsg) {
      setError(errorMsg)
      return
    }
    router.replace("/")
  }

  const handleResend = async () => {
    setResending(true)
    setInfo(null)
    try {
      // reenviar e-mail de confirmação de cadastro
      const redirect = `${window.location.origin}/auth/callback`
      const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: redirect } as any })
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
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8 overflow-hidden">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%239C92AC' fillOpacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>
      <div className="container mx-auto max-w-md">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-4">
            <div className="scale-75 sm:scale-90">
              <MoleculeLogo />
            </div>
            <div className="text-left">
              <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
                DegradScan
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="inline-flex items-center gap-2 text-sm text-slate-400 font-medium">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  Powered by AI
                </span>
                <span className="inline-flex items-center gap-2 text-sm text-slate-400 font-medium">
                  <Zap className="h-4 w-4 text-emerald-400" />
                  Cache Inteligente
                </span>
              </div>
            </div>
          </div>
        </div>
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
      <div className="mt-10 flex flex-col items-center justify-center gap-3 text-slate-300">
        <span className="text-sm">Desenvolvedor</span>
        <div className="flex items-center justify-center gap-4">
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
        <div className="text-sm text-slate-400">
          contato: <a href="mailto:degradscan@gmail.com" className="text-blue-400 hover:text-blue-300">degradscan@gmail.com</a>
        </div>
      </div>
    </div>
  )
}
