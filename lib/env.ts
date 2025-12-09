export function getGeminiApiKey(): string {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ""
  )
}

export function getOpenRouterApiKey(): string {
  return (
    process.env.OPEN_ROUTER_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    ""
  )
}

export function getForceAI(): boolean {
  return (process.env.DEGRADSCAN_FORCE_AI || "").toLowerCase() === "true"
}

export function getOpenRouterModel(): string {
  return (
    process.env.OPEN_ROUTER_MODEL ||
    process.env.OPENROUTER_MODEL ||
    "anthropic/claude-3.5-sonnet"
  )
}
