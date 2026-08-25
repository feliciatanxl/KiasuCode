import { Link } from 'react-router-dom'

import { Logo } from '../components/Logo'
import { useAuth } from '../context/AuthContext'

export function LandingPage() {
  const { isAuthenticated } = useAuth()
  const destination = isAuthenticated ? '/dashboard' : '/login'

  return (
    <div className="app-shell landing-page">
      <header className="site-header landing-header">
        <Link className="brand" to="/" aria-label="KiasuCode home">
          <Logo className="text-[18px]" />
        </Link>
        <nav className="hidden lg:flex" aria-label="Landing page navigation">
          <a href="#features">Features</a>
          <a href="#dev-lingua">Dev-Lingua</a>
          <a href="#simulator">Simulator</a>
        </nav>
        <div className="header-actions">
          <span className="system-status"><i /> public beta open</span>
          <Link className="button button--dark whitespace-nowrap" to={destination}>
            {isAuthenticated ? 'Open dashboard' : 'Log in to Dashboard'} <span>→</span>
          </Link>
        </div>
      </header>

      <main id="top">
        <section className="hero-section landing-hero flex flex-col gap-12 px-5 py-16 md:grid md:grid-cols-2 md:items-center md:gap-10 md:px-7 lg:gap-[74px] lg:py-24">
          <div className="hero-copy w-full text-center md:text-left">
            <div className="hero-kicker">
              <span>Academic Build Tracker</span>
              <code>public-beta</code>
            </div>
            <h1 className="text-[2.65rem] leading-[0.98] sm:text-5xl md:text-[3.2rem] lg:text-[4.25rem]">
              Ship your semester.<br />
              <span>No merge conflicts.</span>
            </h1>
            <p>
              Your grades deserve better tooling. Track modules like commits,
              stage GPA scenarios, and get just enough Singlish encouragement
              to keep the academic build green.
            </p>
            <div className="hero-actions flex flex-col sm:flex-row">
              <Link className="button button--primary button--large" to={destination}>
                {isAuthenticated ? 'Continue to dashboard' : 'Get started free'} <span>→</span>
              </Link>
              <a className="button button--ghost button--large" href="#features">
                See how it works
              </a>
            </div>
            <div className="hero-meta">
              <span><i>✓</i> No spreadsheet chaos</span>
              <span><i>✓</i> Built for SG students</span>
            </div>
          </div>

          <div className="marketing-terminal w-full max-w-xl self-center md:max-w-none" aria-label="KiasuCode product preview">
            <div className="terminal-card__bar">
              <div className="terminal-dots" aria-hidden="true"><span /><span /><span /></div>
              <span>kiasu@semester: ~</span>
              <span className="terminal-live"><i /> preview</span>
            </div>
            <div className="marketing-terminal__body">
              <p className="marketing-terminal__command"><span>$</span> kiasu ship --semester 02</p>
              <div className="marketing-terminal__success">
                <span>✓</span>
                <div><strong>Ready to merge, can.</strong><small>All academic checks passing.</small></div>
              </div>
              <div className="marketing-terminal__stats">
                <div><span>CURRENT GPA</span><strong>3.55</strong><small>+0.12 ↗</small></div>
                <div><span>MODULES</span><strong>06</strong><small>4 merged</small></div>
                <div><span>STREAK</span><strong>18d</strong><small>steady lah</small></div>
              </div>
              <div className="marketing-terminal__graph" aria-hidden="true">
                {[42, 53, 48, 68, 62, 78, 86, 94].map((height, index) => (
                  <span style={{ height: `${height}%` }} key={index} />
                ))}
              </div>
              <div className="marketing-terminal__log">
                <p><span>●</span> CS2030S merged into main</p>
                <p><span>●</span> CS2103T assignment staged</p>
                <p><span>◇</span> ST2334 waiting in backlog</p>
              </div>
            </div>
            <div className="preview-badge"><span>✓</span> GPA pipeline green</div>
          </div>
        </section>

        <section className="trust-strip" aria-label="Product principles">
          <span>TRACK EVERY CU</span><i />
          <span>SIMULATE BEFORE RESULTS</span><i />
          <span>SHIP STEADY</span><i />
          <span>NO KANCHIONG</span>
        </section>

        <section className="marketing-features px-5 sm:px-7" id="features">
          <div className="marketing-heading">
            <span className="eyebrow">A better academic workflow</span>
            <h2>Study less like a spreadsheet.<br />Build more like a developer.</h2>
            <p>Three focused tools. One clean source of truth for your semester.</p>
          </div>

          <article className="feature-showcase">
            <div className="feature-showcase__copy">
              <span className="feature-number">01 / PIPELINE</span>
              <h3>Every module is a commit.</h3>
              <p>
                Move classes from backlog to in-progress, record grades, and
                merge completed modules into your academic history. Your GPA
                updates with every clean commit.
              </p>
              <ul>
                <li><span>✓</span> Credit-weighted GPA calculation</li>
                <li><span>✓</span> Clear semester branch history</li>
                <li><span>✓</span> Targets and actuals side by side</li>
              </ul>
            </div>
            <div className="feature-visual pipeline-preview">
              <div className="visual-topline"><span>module.pipeline</span><code>semester/02</code></div>
              {[
                ['CS2030S', 'Programming Methodology II', 'A-', 'merged'],
                ['CS2103T', 'Software Engineering', 'A', 'in review'],
                ['ST2334', 'Probability & Statistics', 'B+', 'backlog'],
              ].map(([code, name, grade, status], index) => (
                <div className="preview-commit" key={code}>
                  <span className="preview-commit__node"><i />{index < 2 ? <b /> : null}</span>
                  <div><strong>{code}</strong><small>{name}</small></div>
                  <code>{grade}</code>
                  <em className={`preview-status preview-status--${status.replace(' ', '-')}`}>{status}</em>
                </div>
              ))}
            </div>
          </article>

          <article className="feature-showcase feature-showcase--reverse" id="dev-lingua">
            <div className="feature-showcase__copy">
              <span className="feature-number">02 / DEV-LINGUA BOT</span>
              <h3>Your academic copilot, steady lah.</h3>
              <p>
                Log updates from Telegram and get feedback in a hybrid of
                developer speak and Singlish. Useful reminders without the
                corporate chatbot energy.
              </p>
              <ul>
                <li><span>✓</span> Quick updates from Telegram</li>
                <li><span>✓</span> Deadline and regression alerts</li>
                <li><span>✓</span> Encouragement with local flavour</li>
              </ul>
            </div>
            <div className="feature-visual bot-preview">
              <div className="bot-preview__header">
                <span className="telegram-mark">➤</span>
                <div><strong>KiasuCode Bot</strong><small><i /> online</small></div>
              </div>
              <div className="chat-bubble chat-bubble--bot">
                <span>BOT · 10:42</span>
                <p>CS2103T assignment merged. LGTM—one less fire to fight lah! 🔥</p>
              </div>
              <div className="chat-bubble chat-bubble--user">
                <span>YOU · 10:43</span>
                <p>/gpa status</p>
              </div>
              <div className="chat-bubble chat-bubble--bot">
                <span>BOT · 10:43</span>
                <p>Projected GPA <strong>3.73</strong>. Pipeline green, boss.</p>
              </div>
              <div className="bot-input"><span>Message KiasuCode...</span><button type="button" tabIndex={-1}>↑</button></div>
            </div>
          </article>

          <article className="feature-showcase" id="simulator">
            <div className="feature-showcase__copy">
              <span className="feature-number">03 / STAGING</span>
              <h3>Test outcomes before production.</h3>
              <p>
                Stage hypothetical grades in a safe sandbox. See how every exam
                result could affect your cumulative GPA without changing your
                real module records.
              </p>
              <ul>
                <li><span>✓</span> Instant what-if recalculation</li>
                <li><span>✓</span> Live GPA delta feedback</li>
                <li><span>✓</span> Zero changes to production data</li>
              </ul>
            </div>
            <div className="feature-visual simulator-preview">
              <div className="visual-topline"><span>staging.simulator</span><code>safe sandbox</code></div>
              <div className="simulator-preview__score">
                <div><small>CURRENT</small><strong>3.55</strong></div>
                <span>→</span>
                <div><small>STAGED</small><strong>3.73</strong></div>
                <em>+0.18 GPA</em>
              </div>
              <div className="grade-sliders">
                {[
                  ['CS2103T', 'A-'],
                  ['ST2334', 'B+'],
                  ['IS3107', 'A'],
                ].map(([code, grade], index) => (
                  <div key={code}><code>{code}</code><span><i style={{ width: `${82 - index * 12}%` }} /></span><strong>{grade}</strong></div>
                ))}
              </div>
              <p><span>i</span> Scenario staged only. Live GPA untouched.</p>
            </div>
          </article>
        </section>

        <section className="landing-cta">
          <span className="eyebrow">Ready to initialize?</span>
          <h2>Your semester repository<br />starts here.</h2>
          <p>No setup drama. Demo the full dashboard in one click.</p>
          <Link className="button button--primary button--large" to={destination}>
            {isAuthenticated ? 'Open dashboard' : 'Start tracking free'} <span>→</span>
          </Link>
          <code>$ kiasu init academic-build</code>
        </section>
      </main>

      <footer>
        <div className="brand brand--footer">
          <Logo className="text-[18px] text-white" />
        </div>
        <p>Built with <span>⌨</span> and kopi. Ship steady, score steady.</p>
        <code>public-beta · Singapore</code>
      </footer>
    </div>
  )
}
