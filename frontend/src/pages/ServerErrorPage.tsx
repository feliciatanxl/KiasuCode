import { Link } from 'react-router-dom'

import { Logo } from '../components/Logo'

export function ServerErrorPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section className="w-full max-w-xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-xl dark:border-red-950 dark:bg-slate-900 sm:p-12">
        <Logo className="mx-auto text-[18px]" />
        <p className="mt-8 font-mono text-sm font-bold uppercase tracking-[0.3em] text-red-600 dark:text-red-400">
          HTTP 500
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
          Build interrupted
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
          KiasuCode hit an unexpected error. Your account is safe; reload the page or return to the dashboard.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            type="button"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            to="/dashboard"
          >
            Dashboard
          </Link>
        </div>
      </section>
    </main>
  )
}
