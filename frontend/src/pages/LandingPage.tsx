import { Link } from 'react-router-dom'

import { Logo } from '../components/Logo'
import { useAuth } from '../context/AuthContext'

export function LandingPage() {
  const { isAuthenticated } = useAuth()
  const destination = isAuthenticated ? '/dashboard' : '/login'

  return (
    <div className="app-shell landing-page !bg-slate-50 text-slate-900 transition-colors dark:!bg-slate-900 dark:text-slate-100">
      <header className="site-header landing-header !border-slate-200 !bg-white text-slate-900 dark:!border-slate-700 dark:!bg-slate-900 dark:text-slate-100">
        <Link className="brand" to="/" aria-label="KiasuCode home">
          <Logo className="text-[18px]" />
        </Link>
        <nav className="hidden lg:flex" aria-label="Landing page navigation">
          <a className="!text-slate-600 hover:!text-slate-900 dark:!text-slate-300 dark:hover:!text-white" href="#pomodoro-pet">
            Pomodoro Pet
          </a>
          <a className="!text-slate-600 hover:!text-slate-900 dark:!text-slate-300 dark:hover:!text-white" href="#countdowns">
            DaysMatter
          </a>
          <a className="!text-slate-600 hover:!text-slate-900 dark:!text-slate-300 dark:hover:!text-white" href="#file-pipeline">
            Module Files
          </a>
          <a className="!text-slate-600 hover:!text-slate-900 dark:!text-slate-300 dark:hover:!text-white" href="#simulator">
            GPA Sandbox
          </a>
        </nav>
        <div className="header-actions">
          <span className="system-status !text-emerald-600 dark:!text-emerald-400">
            <i className="animate-pulse bg-emerald-500" /> 90% Maturity · RC Ready
          </span>
          <Link className="button button--dark whitespace-nowrap" to={destination}>
            {isAuthenticated ? 'Open dashboard' : 'Launch Console'} <span>→</span>
          </Link>
        </div>
      </header>

      <main id="top">
        {/* HERO SECTION */}
        <section className="hero-section landing-hero flex flex-col gap-12 px-5 py-16 md:grid md:grid-cols-2 md:items-center md:gap-10 md:px-7 lg:gap-[74px] lg:py-24">
          <div className="hero-copy w-full text-center md:text-left">
            <div className="hero-kicker">
              <span>Academic Operating System</span>
              <code className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                v0.9.0-rc
              </code>
            </div>
            <h1 className="text-[2.65rem] leading-[0.98] text-slate-900 dark:text-slate-100 sm:text-5xl md:text-[3.2rem] lg:text-[4.25rem]">
              Ship your semester.<br />
              <span className="text-blue-600 dark:text-blue-400">Zero merge conflicts.</span>
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              Stop juggling messy spreadsheets, scattered PDFs, and forgotten deadlines.
              KiasuCode unites <strong>Pomodoro Pet companions</strong>, <strong>DaysMatter countdown rings</strong>,
              and <strong>Git-style module file management</strong> into one unified cockpit for Singapore students.
            </p>
            <div className="hero-actions flex flex-col sm:flex-row">
              <Link className="button button--primary button--large" to={destination}>
                {isAuthenticated ? 'Continue to dashboard' : 'Initialize Workspace'} <span>→</span>
              </Link>
              <a className="button button--ghost button--large" href="#pomodoro-pet">
                Tour Core Loops
              </a>
            </div>
            <div className="hero-meta text-slate-500 dark:text-slate-400">
              <span><i>✓</i> 100% Parameterized & Secure</span>
              <span><i>✓</i> NUS · NTU · SMU · Polys Supported</span>
              <span><i>✓</i> Automated httpOnly Auth</span>
            </div>
          </div>

          <div className="marketing-terminal w-full max-w-xl self-center md:max-w-none" aria-label="KiasuCode product preview">
            <div className="terminal-card__bar">
              <div className="terminal-dots" aria-hidden="true"><span /><span /><span /></div>
              <span>kiasu@academic-os: ~</span>
              <span className="terminal-live"><i /> status: green</span>
            </div>
            <div className="marketing-terminal__body">
              <p className="marketing-terminal__command"><span>$</span> kiasucode status --full</p>
              <div className="marketing-terminal__success">
                <span>✓</span>
                <div>
                  <strong>Academic build passing cleanly.</strong>
                  <small>3 modules staged · 1 countdown critical · Pet well-fed.</small>
                </div>
              </div>
              <div className="marketing-terminal__stats">
                <div><span>CURRENT GPA</span><strong>3.82</strong><small>+0.14 ↗</small></div>
                <div><span>FOCUS COINS</span><strong>145</strong><small>100% happy</small></div>
                <div><span>NEXT DEADLINE</span><strong>14d 6h</strong><small>CS2103T</small></div>
              </div>
              <div className="marketing-terminal__graph" aria-hidden="true">
                {[45, 58, 52, 74, 69, 82, 91, 98].map((height, index) => (
                  <span style={{ height: `${height}%` }} key={index} />
                ))}
              </div>
              <div className="marketing-terminal__log">
                <p><span>●</span> CS2103T: 2 lecture slides attached (4.2 MB)</p>
                <p><span>●</span> Pomodoro block completed: +25 coins deposited</p>
                <p><span>◇</span> DaysMatter: Exam countdown tracking active</p>
              </div>
            </div>
            <div className="preview-badge border-slate-200 bg-white text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-400">
              <span>✓</span> System 90% Mature · Release Candidate
            </div>
          </div>
        </section>

        {/* TRUST STRIP */}
        <section className="trust-strip border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400" aria-label="Product principles">
          <span>POMODORO PET COMPANIONS</span><i />
          <span>DAYSMATTER COUNTDOWNS</span><i />
          <span>MODULE FILE STORAGE</span><i />
          <span>GPA STAGING SIMULATION</span><i />
          <span>ZERO SPREADSHEET CHAOS</span>
        </section>

        {/* CORE LOOPS SECTION */}
        <section className="marketing-features px-5 sm:px-7" id="features">
          <div className="marketing-heading">
            <span className="eyebrow">Production-Ready Architecture</span>
            <h2 className="text-slate-900 dark:text-slate-100">
              Three essential loops.<br />One high-performance cockpit.
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Designed around how technical students actually study, organize files, and manage exam pressure.
            </p>
          </div>

          {/* CORE LOOP 1: POMODORO PET */}
          <article className="feature-showcase" id="pomodoro-pet">
            <div className="feature-showcase__copy text-slate-500 dark:text-slate-400">
              <span className="feature-number">01 / GAMIFIED FOCUS</span>
              <h3 className="text-slate-900 dark:text-slate-100">
                Pomodoro Pet Gamification.
              </h3>
              <p>
                Turn brutal revision sprints into tangible dopamine. Lock into focused
                25-minute study intervals linked directly to your active modules.
                Earn study coins, replenish your pet's hunger, and maintain 100% happiness.
              </p>
              <ul>
                <li><span>✓</span> 25-minute Pomodoro timers linked to active modules</li>
                <li><span>✓</span> 1 study coin awarded per minute of focused revision</li>
                <li><span>✓</span> Interactive pet feeding with dynamic hunger & happiness stats</li>
              </ul>
            </div>

            <div className="feature-visual pet-preview border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6 rounded-2xl shadow-sm">
              <div className="visual-topline border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <span>pomodoro.pet.runtime</span>
                <code>streak: 18d</code>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700/60 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <span className="text-3xl" role="img" aria-label="Pet companion">🦖</span>
                  <div>
                    <strong className="text-base text-slate-900 dark:text-slate-100 block">Kiasu Dino</strong>
                    <small className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Mood: Super Shiok!</small>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 dark:text-slate-500 block font-mono">WALLET</span>
                  <strong className="text-lg font-mono font-black text-amber-500">🪙 240</strong>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600 dark:text-slate-300">Hunger</span>
                    <span className="text-slate-900 dark:text-slate-100 font-mono">92 / 100</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '92%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600 dark:text-slate-300">Happiness</span>
                    <span className="text-slate-900 dark:text-slate-100 font-mono">100 / 100</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-center dark:border-blue-900/60 dark:bg-blue-950/30">
                <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300">
                  ACTIVE FOCUS · CS2103T (24:18 remaining)
                </span>
              </div>
            </div>
          </article>

          {/* CORE LOOP 2: DAYSMATTER COUNTDOWNS */}
          <article className="feature-showcase feature-showcase--reverse" id="countdowns">
            <div className="feature-showcase__copy text-slate-500 dark:text-slate-400">
              <span className="feature-number">02 / DEADLINE RADAR</span>
              <h3 className="text-slate-900 dark:text-slate-100">
                DaysMatter Academic Countdowns.
              </h3>
              <p>
                Never suffer from deadline blindness again. Keep your midterms, final exams,
                project submissions, and personal milestones in plain sight with high-visibility
                circular progress rings and smart urgency tags.
              </p>
              <ul>
                <li><span>✓</span> Precision days & hours countdown clock with live SVG progress rings</li>
                <li><span>✓</span> Categorized by Exam, Assignment, Project, and Personal</li>
                <li><span>✓</span> Instant visual alerts for items due within 24 hours</li>
              </ul>
            </div>

            <div className="feature-visual countdown-preview border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6 rounded-2xl shadow-sm">
              <div className="visual-topline border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <span>daysmatter.academic</span>
                <code>active: 3</code>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50/50 p-3.5 dark:border-red-900/50 dark:bg-red-950/20">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full border-2 border-red-500 flex items-center justify-center font-mono text-xs font-bold text-red-600 dark:text-red-400">
                      78%
                    </div>
                    <div>
                      <strong className="text-sm text-slate-900 dark:text-slate-100 block">CS2103T Final Exam</strong>
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300">EXAM</span>
                    </div>
                  </div>
                  <strong className="font-mono text-base font-black text-red-600 dark:text-red-400">14d 6h</strong>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 dark:border-blue-900/50 dark:bg-blue-950/20">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full border-2 border-blue-500 flex items-center justify-center font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      35%
                    </div>
                    <div>
                      <strong className="text-sm text-slate-900 dark:text-slate-100 block">ST2334 Final Project</strong>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">PROJECT</span>
                    </div>
                  </div>
                  <strong className="font-mono text-base font-black text-slate-900 dark:text-slate-100">3d 12h</strong>
                </div>
              </div>
            </div>
          </article>

          {/* CORE LOOP 3: MODULE FILE MANAGEMENT */}
          <article className="feature-showcase" id="file-pipeline">
            <div className="feature-showcase__copy text-slate-500 dark:text-slate-400">
              <span className="feature-number">03 / ASSET MANAGEMENT</span>
              <h3 className="text-slate-900 dark:text-slate-100">
                Module Pipeline & File Storage.
              </h3>
              <p>
                Treat your modules like git commits. Move classes from Backlog to In-Progress to
                Merged. Attach lecture slides, cheat sheets, and project PDFs directly to the module
                record for instant, centralized retrieval throughout the semester.
              </p>
              <ul>
                <li><span>✓</span> Direct multipart file upload pipeline with 15MB capacity</li>
                <li><span>✓</span> One-click download access from any device</li>
                <li><span>✓</span> Ownership validation and cascading database cleanup</li>
              </ul>
            </div>

            <div className="feature-visual file-preview border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6 rounded-2xl shadow-sm">
              <div className="visual-topline border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <span>module.files.vault</span>
                <code>CS2103T / attachments</code>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base">📄</span>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block">Lecture10_DesignPatterns.pdf</span>
                      <small className="text-[10px] text-slate-400 font-mono">2.4 MB · Uploaded Aug 28</small>
                    </div>
                  </div>
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    ↓ Download
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base">📄</span>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block">Exam_Cheatsheet_Final.pdf</span>
                      <small className="text-[10px] text-slate-400 font-mono">1.1 MB · Uploaded Aug 29</small>
                    </div>
                  </div>
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    ↓ Download
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded border border-dashed border-slate-300 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">+ Attach new document</span>
              </div>
            </div>
          </article>
        </section>

        {/* FINAL CTA */}
        <section className="landing-cta">
          <span className="eyebrow">Ready to initialize?</span>
          <h2>Your academic build starts now.</h2>
          <p>Production-ready tools. Zero setup drama. Launch your cockpit in one click.</p>
          <Link className="button button--primary button--large" to={destination}>
            {isAuthenticated ? 'Open dashboard' : 'Initialize Workspace Free'} <span>→</span>
          </Link>
          <code>$ npx kiasucode init --release v0.9.0</code>
        </section>
      </main>

      <footer>
        <div className="brand brand--footer">
          <Logo className="text-[18px] text-white" />
        </div>
        <p>Built with <span>⌨</span> and kopi. Ship steady, score steady.</p>
        <code>v0.9.0-rc · Singapore</code>
      </footer>
    </div>
  )
}
