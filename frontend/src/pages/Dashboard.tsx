import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { DevLinguaFlavor, Module } from '@kiasucode/shared'

import { DevLinguaBanner } from '../components/DevLinguaBanner'
import { GpaDashboard } from '../components/GpaDashboard'
import { Logo } from '../components/Logo'
import { ModulePipeline } from '../components/ModulePipeline'
import { StagingSimulator } from '../components/StagingSimulator'
import { TelegramConnectModal } from '../components/TelegramConnectModal'
import { TerminalHero } from '../components/TerminalHero'
import { useAuth } from '../context/AuthContext'
import {
  calculateCurrentGpa,
  calculateEarnedCredits,
  calculateTargetGpa,
} from '../utils/gpa'

const semester = 'AY25/26 · S2'

const initialModules: Module[] = [
  {
    id: 'a81d9c',
    moduleCode: 'CS2030S',
    moduleName: 'Programming Methodology II',
    creditUnits: 4,
    targetGrade: 'A',
    actualGrade: 'A-',
    status: 'merged',
    semester,
  },
  {
    id: 'b42ef1',
    moduleCode: 'CS2040S',
    moduleName: 'Data Structures and Algorithms',
    creditUnits: 4,
    targetGrade: 'A-',
    actualGrade: 'B+',
    status: 'merged',
    semester,
  },
  {
    id: 'f19aa4',
    moduleCode: 'IS1108',
    moduleName: 'Digital Ethics and Data Privacy',
    creditUnits: 4,
    targetGrade: 'A',
    actualGrade: 'A',
    status: 'merged',
    semester,
  },
  {
    id: 'c73b20',
    moduleCode: 'MA1521',
    moduleName: 'Calculus for Computing',
    creditUnits: 4,
    targetGrade: 'B+',
    actualGrade: 'B',
    status: 'merged',
    semester,
  },
  {
    id: 'd62ce8',
    moduleCode: 'CS2103T',
    moduleName: 'Software Engineering',
    creditUnits: 4,
    targetGrade: 'A-',
    actualGrade: null,
    status: 'in-progress',
    semester,
  },
  {
    id: 'e04a17',
    moduleCode: 'ST2334',
    moduleName: 'Probability and Statistics',
    creditUnits: 4,
    targetGrade: 'B+',
    actualGrade: null,
    status: 'backlog',
    semester,
  },
]

type WorkspaceTab = 'pipeline' | 'simulator'

export function Dashboard() {
  const [modules, setModules] = useState<Module[]>(initialModules)
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('pipeline')
  const [isTelegramOpen, setIsTelegramOpen] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  const currentGpa = useMemo(() => calculateCurrentGpa(modules), [modules])
  const targetGpa = useMemo(() => calculateTargetGpa(modules), [modules])
  const earnedCredits = useMemo(
    () => calculateEarnedCredits(modules),
    [modules],
  )
  const mergedModules = modules.filter(
    (module) => module.status === 'merged',
  ).length
  const nextModule = modules.find((module) => module.status !== 'merged')

  const flavor: DevLinguaFlavor =
    currentGpa >= 3.5 ? 'positive' : currentGpa < 3 ? 'negative' : 'casual'

  const openWorkspace = (tab: WorkspaceTab) => {
    setActiveTab(tab)
    window.setTimeout(() => {
      document.querySelector('#workspace')?.scrollIntoView({ behavior: 'smooth' })
    }, 0)
  }

  const handleLogout = () => {
    navigate('/logout', { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="site-header dashboard-header">
        <Link className="brand" to="/" aria-label="KiasuCode home">
          <Logo className="text-[18px]" />
        </Link>
        <nav aria-label="Dashboard navigation">
          <a href="#dashboard">Dashboard</a>
          <button type="button" onClick={() => openWorkspace('pipeline')}>Pipeline</button>
          <button type="button" onClick={() => openWorkspace('simulator')}>Simulator</button>
        </nav>
        <div className="header-actions">
          <button
            className="button button--dark telegram-connect-button"
            type="button"
            onClick={() => setIsTelegramOpen(true)}
          >
            <span>➤</span> Connect Telegram
          </button>
          <div className="user-chip" title={user?.name}>
            <span>{user?.avatar ?? 'KC'}</span>
            <strong>{user?.name ?? 'Student'}</strong>
          </div>
          <button
            className="logout-button"
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            title="Log out"
          >
            ↪
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <div className="hero-kicker">
              <span>Academic Build Tracker</span>
              <code>v1.0.0-beta</code>
            </div>
            <h1>
              Ship your semester.<br />
              <span>No merge conflicts.</span>
            </h1>
            <p>
              Track modules like commits, simulate grades before production,
              and keep your GPA pipeline green. Built for students who think in
              branches, not binders.
            </p>
            <div className="hero-actions">
              <button
                className="button button--primary button--large"
                type="button"
                onClick={() => openWorkspace('pipeline')}
              >
                View module pipeline <span>→</span>
              </button>
              <button
                className="button button--ghost button--large"
                type="button"
                onClick={() => openWorkspace('simulator')}
              >
                Run grade simulation
              </button>
            </div>
            <div className="hero-meta">
              <span><i>✓</i> Local-first prototype</span>
              <span><i>✓</i> Zero kanchiong mode</span>
            </div>
          </div>
          <TerminalHero
            currentGpa={currentGpa}
            mergedModules={mergedModules}
            totalModules={modules.length}
            semester={semester}
          />
        </section>

        <section className="dashboard-section" id="dashboard">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Build overview · {semester}</span>
              <h2>Your academic repository</h2>
            </div>
            <div className="branch-badge">
              <span aria-hidden="true">⑂</span>
              <div><small>CURRENT BRANCH</small><strong>semester/02</strong></div>
            </div>
          </div>

          <DevLinguaBanner
            flavor={flavor}
            context={{
              gpa: currentGpa,
              targetGpa,
              moduleCode: nextModule?.moduleCode,
              status: nextModule?.status,
            }}
          />

          <GpaDashboard
            currentGpa={currentGpa}
            earnedCredits={earnedCredits}
            targetGpa={targetGpa}
            modules={modules}
          />
        </section>

        <section className="workspace-section" id="workspace">
          <div className="workspace-tabs" role="tablist" aria-label="Academic workspace">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'pipeline'}
              className={activeTab === 'pipeline' ? 'is-active' : ''}
              onClick={() => setActiveTab('pipeline')}
            >
              <span>⑂</span> Module pipeline
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'simulator'}
              className={activeTab === 'simulator' ? 'is-active' : ''}
              onClick={() => setActiveTab('simulator')}
            >
              <span>⌁</span> Staging simulator
              <em>PLAYGROUND</em>
            </button>
          </div>

          {activeTab === 'pipeline' ? (
            <ModulePipeline
              modules={modules}
              onModulesChange={setModules}
              semester={semester}
            />
          ) : (
            <StagingSimulator modules={modules} />
          )}
        </section>
      </main>

      <footer>
        <div className="brand brand--footer">
          <Logo className="text-[18px] text-white" />
        </div>
        <p>Built with <span>⌨</span> and kopi. Ship steady, score steady.</p>
        <code>build: passing · latency: 0ms</code>
      </footer>

      <TelegramConnectModal
        isOpen={isTelegramOpen}
        onClose={() => setIsTelegramOpen(false)}
      />
    </div>
  )
}
