import { NextRequest } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || ""
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null
  if (!token) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 })
  }

  const { data: userData, error: userErr } = await supabaseServer.auth.getUser(token!)
  if (userErr || !userData?.user?.email) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 })
  }

  const allowed = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim()).filter(Boolean)
  if (!allowed.includes(userData.user.email)) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 })
  }

  const { data, error } = await supabaseServer.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const items = (data?.users || []).map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    email_confirmed_at: (u as any).email_confirmed_at || null,
    phone: u.phone || null,
    last_sign_in_at: (u as any).last_sign_in_at || null,
  }))

  return new Response(JSON.stringify({ items }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

