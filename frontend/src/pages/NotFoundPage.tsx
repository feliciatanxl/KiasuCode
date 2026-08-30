import { Link } from 'react-router-dom'

import { Logo } from '../components/Logo'

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-12">
        <Logo className="mx-auto text-[18px]" />
        <p className="mt-8 font-mono text-sm font-bold uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">
          HTTP 404
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
          Page not found
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
          This route is not part of the current KiasuCode build. It may have moved or never existed.
        </p>
        <Link
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          to="/dashboard"
        >
          Return to Dashboard
        </Link>
      </section>
    </main>
  )
}
