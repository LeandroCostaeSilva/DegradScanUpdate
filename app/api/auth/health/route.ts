import { supabaseServer } from "@/lib/supabase-server"

export async function GET() {
  const okEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const okServer = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  let dbOk = false
  try {
    const { error } = await supabaseServer.rpc("health_ping")
    dbOk = !error
  } catch {
    dbOk = false
  }
  return new Response(JSON.stringify({ okEnv, okServer, dbOk }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

