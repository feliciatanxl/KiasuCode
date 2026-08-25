import { useMemo, useState, type FormEvent } from 'react'
import type {
  GradeLetter,
  Module,
  ModuleStatus,
} from '@kiasucode/shared'

import { GRADE_OPTIONS } from '../utils/gpa'

interface ModulePipelineProps {
  modules: Module[]
  onModulesChange: (modules: Module[]) => void
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
  onModulesChange,
  semester,
}: ModulePipelineProps) {
  const [filter, setFilter] = useState<PipelineFilter>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [draft, setDraft] = useState({
    moduleCode: '',
    moduleName: '',
    creditUnits: 4,
    targetGrade: 'A-' as GradeLetter,
  })

  const visibleModules = useMemo(
    () =>
      filter === 'all'
        ? modules
        : modules.filter((module) => module.status === filter),
    [filter, modules],
  )

  const updateModule = (id: string, patch: Partial<Module>) => {
    onModulesChange(
      modules.map((module) =>
        module.id === id ? { ...module, ...patch } : module,
      ),
    )
  }

  const cycleStatus = (module: Module) => {
    const currentIndex = statusOrder.indexOf(module.status)
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length]
    if (!nextStatus) return

    updateModule(module.id, {
      status: nextStatus,
      actualGrade:
        nextStatus === 'merged'
          ? (module.actualGrade ?? module.targetGrade)
          : module.actualGrade,
    })
  }

  const addModule = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.moduleCode.trim() || !draft.moduleName.trim()) return

    const module: Module = {
      id: crypto.randomUUID(),
      moduleCode: draft.moduleCode.trim().toUpperCase(),
      moduleName: draft.moduleName.trim(),
      creditUnits: draft.creditUnits,
      targetGrade: draft.targetGrade,
      actualGrade: null,
      status: 'backlog',
      semester,
    }

    onModulesChange([...modules, module])
    setDraft({
      moduleCode: '',
      moduleName: '',
      creditUnits: 4,
      targetGrade: 'A-',
    })
    setShowAddForm(false)
  }

  return (
    <section className="workspace-panel" aria-labelledby="pipeline-title">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Git-style module tracker</span>
          <h2 id="pipeline-title">Module pipeline</h2>
          <p>Move every academic commit from backlog to merged.</p>
        </div>
        <button
          className="button button--primary"
          type="button"
          onClick={() => setShowAddForm((visible) => !visible)}
        >
          <span aria-hidden="true">+</span> Add module
        </button>
      </div>

      {showAddForm ? (
        <form className="module-form" onSubmit={addModule}>
          <label>
            <span>Module code</span>
            <input
              autoFocus
              value={draft.moduleCode}
              onChange={(event) =>
                setDraft({ ...draft, moduleCode: event.target.value })
              }
              placeholder="CS2103T"
              required
            />
          </label>
          <label className="module-form__name">
            <span>Module name</span>
            <input
              value={draft.moduleName}
              onChange={(event) =>
                setDraft({ ...draft, moduleName: event.target.value })
              }
              placeholder="Software Engineering"
              required
            />
          </label>
          <label>
            <span>Credit units</span>
            <input
              type="number"
              min="1"
              max="12"
              value={draft.creditUnits}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  creditUnits: Number(event.target.value),
                })
              }
              required
            />
          </label>
          <label>
            <span>Target</span>
            <select
              value={draft.targetGrade}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  targetGrade: event.target.value as GradeLetter,
                })
              }
            >
              {GRADE_OPTIONS.map((grade) => (
                <option key={grade}>{grade}</option>
              ))}
            </select>
          </label>
          <div className="module-form__actions">
            <button className="button button--primary" type="submit">
              Commit module
            </button>
            <button
              className="button button--ghost"
              type="button"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="pipeline-toolbar">
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
        <code>{semester} / main</code>
      </div>

      <div className="pipeline-table" role="table" aria-label="Module pipeline">
        <div className="pipeline-row pipeline-row--header" role="row">
          <span role="columnheader">Commit / module</span>
          <span role="columnheader">CU</span>
          <span role="columnheader">Target</span>
          <span role="columnheader">Actual</span>
          <span role="columnheader">Pipeline state</span>
          <span role="columnheader" aria-label="Actions" />
        </div>
        {visibleModules.map((module, index) => (
          <div className="pipeline-row" role="row" key={module.id}>
            <div className="module-identity" role="cell">
              <span className="commit-node" aria-hidden="true">
                <i />
                {index < visibleModules.length - 1 ? <b /> : null}
              </span>
              <div>
                <strong>{module.moduleCode}</strong>
                <span>{module.moduleName}</span>
                <code>#{module.id.slice(0, 6)}</code>
              </div>
            </div>
            <label className="compact-field" role="cell">
              <span className="sr-only">Credit units for {module.moduleCode}</span>
              <input
                type="number"
                min="1"
                max="12"
                value={module.creditUnits}
                onChange={(event) =>
                  updateModule(module.id, {
                    creditUnits: Number(event.target.value),
                  })
                }
              />
            </label>
            <label className="compact-field" role="cell">
              <span className="sr-only">Target grade for {module.moduleCode}</span>
              <select
                value={module.targetGrade}
                onChange={(event) =>
                  updateModule(module.id, {
                    targetGrade: event.target.value as GradeLetter,
                  })
                }
              >
                {GRADE_OPTIONS.map((grade) => (
                  <option key={grade}>{grade}</option>
                ))}
              </select>
            </label>
            <label className="compact-field" role="cell">
              <span className="sr-only">Actual grade for {module.moduleCode}</span>
              <select
                value={module.actualGrade ?? ''}
                onChange={(event) => {
                  const value = event.target.value as GradeLetter | ''
                  updateModule(module.id, {
                    actualGrade: value || null,
                    status:
                      value && module.status === 'backlog'
                        ? 'in-progress'
                        : module.status,
                  })
                }}
              >
                <option value="">—</option>
                {GRADE_OPTIONS.map((grade) => (
                  <option key={grade}>{grade}</option>
                ))}
              </select>
            </label>
            <div role="cell">
              <button
                type="button"
                className={`status-pill status-pill--${module.status}`}
                onClick={() => cycleStatus(module)}
                title="Click to move to the next pipeline state"
              >
                <i /> {statusLabels[module.status]}
              </button>
            </div>
            <button
              className="row-menu"
              type="button"
              aria-label={`Remove ${module.moduleCode}`}
              title="Remove module"
              onClick={() =>
                onModulesChange(
                  modules.filter((candidate) => candidate.id !== module.id),
                )
              }
            >
              ×
            </button>
          </div>
        ))}
        {visibleModules.length === 0 ? (
          <div className="empty-state">
            <span>git log --empty</span>
            <p>No modules in this stage yet.</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
