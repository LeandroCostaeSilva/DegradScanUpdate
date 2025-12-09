export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="max-w-lg w-full bg-slate-800/60 border border-slate-700 rounded-xl p-6 text-slate-200">
        <h2 className="text-2xl font-semibold mb-2">Página não encontrada</h2>
        <p className="text-slate-400 mb-4">Verifique a URL. Você pode retornar à página inicial ou acessar o login.</p>
        <div className="flex gap-3">
          <a href="/" className="px-4 py-2 rounded-lg bg-blue-600 text-white">Início</a>
          <a href="/login" className="px-4 py-2 rounded-lg border border-slate-600 text-slate-200">Login</a>
        </div>
      </div>
    </div>
  )
}

