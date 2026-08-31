import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  GradeLetter,
  Module,
  ModuleStatus,
} from '@kiasucode/shared'

import { GRADE_OPTIONS } from '../utils/gpa'

interface ModulePipelineProps {
  modules: Module[]
  onDeleteModule: (id: string) => Promise<void>
  onRequestAdd: () => void
  onUpdateModule: (id: string, patch: Partial<Module>) => Promise<void>
  semester: string
}

type PipelineFilter = 'all' | ModuleStatus

const statusOrder: ModuleStatus[] = ['backlog', 'in-progress', 'merged']

const statusLabels: Record<ModuleStatus, string> = {
  backlog: 'Backlog',
  'in-progress': 'In progress',
  merged: 'Merged',
}

export function ModulePipeline({
  modules,
  onDeleteModule,
  onRequestAdd,
  onUpdateModule,
  semester,
}: ModulePipelineProps) {
  const [filter, setFilter] = useState<PipelineFilter>('all')
  const [flashingModuleId, setFlashingModuleId] = useState<string | null>(null)
  const flashTimerRef = useRef<number | null>(null)

  const visibleModules = useMemo(
    () =>
      filter === 'all'
        ? modules
        : modules.filter((module) => module.status === filter),
    [filter, modules],
  )

  useEffect(
    () => () => {
      if (flashTimerRef.current !== null) {
        window.clearTimeout(flashTimerRef.current)
      }
    },
    [],
  )

  const cycleStatus = async (module: Module) => {
    const currentIndex = statusOrder.indexOf(module.status)
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length]
    if (!nextStatus) return

    await onUpdateModule(module.id, {
      status: nextStatus,
      actualGrade:
        nextStatus === 'merged'
          ? (module.actualGrade ?? module.targetGrade)
          : module.actualGrade,
    })

    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current)
    }
    setFlashingModuleId(module.id)
    flashTimerRef.current = window.setTimeout(() => {
      setFlashingModuleId(null)
      flashTimerRef.current = null
    }, 650)
  }

  return (
    <section className="workspace-panel border-slate-200 bg-white transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800" aria-labelledby="pipeline-title">
      <div className="panel-heading border-slate-200 dark:border-slate-700">
        <div>
          <span className="eyebrow">Git-style module tracker</span>
          <h2 className="text-slate-900 dark:text-slate-100" id="pipeline-title">Module Pipeline</h2>
          <p className="text-slate-500 dark:text-slate-400">Move every academic commit from backlog to merged.</p>
        </div>
        <button
          className="button button--primary"
          type="button"
          onClick={onRequestAdd}
        >
          <span aria-hidden="true">+</span> New
        </button>
      </div>

      <div className="pipeline-toolbar border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
        <div className="filter-tabs" role="group" aria-label="Filter modules">
          {(['all', ...statusOrder] as PipelineFilter[]).map((item) => (
            <button
              type="button"
              className={filter === item ? 'is-active' : ''}
              aria-pressed={filter === item}
              key={item}
              onClick={() => setFilter(item)}
            >
              {item === 'all' ? 'All commits' : statusLabels[item]}
              <span>
                {item === 'all'
                  ? modules.length
                  : modules.filter((module) => module.status === item).length}
              </span>
            </button>
          ))}
        </div>
        <code className="text-slate-500 dark:text-slate-400">{semester} / main</code>
      </div>

      <div className="pipeline-table" role="table" aria-label="Module pipeline">
        <div className="pipeline-row pipeline-row--header border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400" role="row">
          <span role="columnheader">Commit / module</span>
          <span role="columnheader">CU</span>
          <span role="columnheader" className="whitespace-nowrap">Target Grade</span>
          <span role="columnheader" className="whitespace-nowrap">Actual Grade</span>
          <span role="columnheader" className="whitespace-nowrap">Pipeline state</span>
          <span role="columnheader" aria-label="Actions" />
        </div>
        {visibleModules.map((module, index) => (
          <div
            className={`pipeline-row border-slate-200 transition-colors duration-500 ease-out dark:border-slate-700 ${
              flashingModuleId === module.id
                ? 'bg-green-100 dark:bg-green-900/20'
                : 'bg-white dark:bg-slate-800'
            }`}
            role="row"
            key={module.id}
          >
            <div className="module-identity" role="cell">
              <span className="commit-node" aria-hidden="true">
                <i />
                {index < visibleModules.length - 1 ? <b /> : null}
              </span>
              <div>
                <strong className="text-slate-900 dark:text-slate-100">{module.moduleCode}</strong>
                <span className="text-slate-500 dark:text-slate-400">{module.moduleName}</span>
                <code className="text-slate-500 dark:text-slate-400">#{module.id.slice(0, 6)}</code>
              </div>
            </div>
            <label className="compact-field" role="cell">
              <span className="sr-only">Credit units for {module.moduleCode}</span>
              <input
                className="border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                type="number"
                min="1"
                max="12"
                value={module.creditUnits}
                onChange={(event) =>
                  void onUpdateModule(module.id, {
                    creditUnits: Number(event.target.value),
                  }).catch(() => undefined)
                }
              />
            </label>
            <label className="compact-field whitespace-nowrap" role="cell">
              <span className="sr-only">Target grade for {module.moduleCode}</span>
              <select
                className="border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                value={module.targetGrade}
                onChange={(event) =>
                  void onUpdateModule(module.id, {
                    targetGrade: event.target.value as GradeLetter,
                  }).catch(() => undefined)
                }
              >
                {GRADE_OPTIONS.map((grade) => (
                  <option key={grade}>{grade}</option>
                ))}
              </select>
            </label>
            <label className="compact-field whitespace-nowrap" role="cell">
              <span className="sr-only">Actual grade for {module.moduleCode}</span>
              <select
                className="border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                value={module.actualGrade ?? ''}
                onChange={(event) => {
                  const value = event.target.value as GradeLetter | ''
                  void onUpdateModule(module.id, {
                    actualGrade: value || null,
                    status:
                      value && module.status === 'backlog'
                        ? 'in-progress'
                        : module.status,
                  }).catch(() => undefined)
                }}
              >
                <option value="">—</option>
                {GRADE_OPTIONS.map((grade) => (
                  <option key={grade}>{grade}</option>
                ))}
              </select>
            </label>
            <div role="cell" className="whitespace-nowrap">
              <button
                type="button"
                className={`status-pill status-pill--${module.status} whitespace-nowrap`}
                onClick={() => void cycleStatus(module).catch(() => undefined)}
                title="Click to move to the next pipeline state"
              >
                <i /> {statusLabels[module.status]}
              </button>
            </div>
            <button
              className="row-menu whitespace-nowrap shrink-0"
              type="button"
              aria-label={`Remove ${module.moduleCode}`}
              title="Remove module"
              onClick={() => void onDeleteModule(module.id).catch(() => undefined)}
            >
              ×
            </button>
          </div>
        ))}
        {visibleModules.length === 0 ? (
          <div className="empty-state text-slate-500 dark:text-slate-400">
            <span>git log --empty</span>
            <p>No modules in this stage yet.</p>
            {filter === 'all' && modules.length === 0 ? (
              <button
                className="button button--primary mt-5"
                type="button"
                onClick={onRequestAdd}
              >
                <span aria-hidden="true">+</span> Add Module
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
