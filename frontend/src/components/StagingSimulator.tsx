import { useMemo, useState } from 'react'
import type { GradeLetter, Module } from '@kiasucode/shared'

import {
  calculateCurrentGpa,
  calculateWeightedGpa,
  formatGpa,
  GRADE_OPTIONS,
} from '../utils/gpa'

interface StagingSimulatorProps {
  modules: Module[]
}

export function StagingSimulator({ modules }: StagingSimulatorProps) {
  const [stagedGrades, setStagedGrades] = useState<Record<string, GradeLetter>>(
    {},
  )

  const currentGpa = calculateCurrentGpa(modules)
  const stagedGpa = useMemo(
    () =>
      calculateWeightedGpa(
        modules.map((module) => ({
          grade:
            module.status === 'merged' && module.actualGrade
              ? module.actualGrade
              : (stagedGrades[module.id] ?? module.targetGrade),
          creditUnits: module.creditUnits,
        })),
      ),
    [modules, stagedGrades],
  )
  const delta = stagedGpa - currentGpa

  const resetScenario = () => setStagedGrades({})

  return (
    <section className="workspace-panel simulator transition-colors duration-300 dark:border-gray-700 dark:bg-gray-800" aria-labelledby="simulator-title">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Safe sandbox · no live mutations</span>
          <h2 id="simulator-title">Staging simulator</h2>
          <p>Test your semester outcome before grades reach production.</p>
        </div>
        <button className="button button--ghost" type="button" onClick={resetScenario}>
          ↺ Reset targets
        </button>
      </div>

      <div className="simulator-summary">
        <div>
          <span>Current baseline</span>
          <strong>{formatGpa(currentGpa)}</strong>
        </div>
        <span className="simulator-summary__arrow" aria-hidden="true">→</span>
        <div className="simulator-summary__result">
          <span>Staged outcome</span>
          <strong>{formatGpa(stagedGpa)}</strong>
        </div>
        <div className={`delta-chip ${delta >= 0 ? 'is-positive' : 'is-negative'}`}>
          {delta >= 0 ? '+' : ''}{formatGpa(delta)} GPA
        </div>
      </div>

      <div className="scenario-grid">
        {modules.map((module) => {
          const isLocked = module.status === 'merged' && module.actualGrade
          const grade = isLocked
            ? module.actualGrade
            : (stagedGrades[module.id] ?? module.targetGrade)

          return (
            <article className="scenario-card transition-colors duration-300 dark:border-gray-700 dark:bg-gray-900" key={module.id}>
              <div className="scenario-card__topline">
                <code>{module.moduleCode}</code>
                <span>{module.creditUnits} CU</span>
              </div>
              <h3>{module.moduleName}</h3>
              <label>
                <span>{isLocked ? 'Merged grade' : 'Stage expected grade'}</span>
                <select
                  value={grade ?? ''}
                  disabled={Boolean(isLocked)}
                  onChange={(event) =>
                    setStagedGrades({
                      ...stagedGrades,
                      [module.id]: event.target.value as GradeLetter,
                    })
                  }
                >
                  {GRADE_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <div className="scenario-card__footer">
                <span>{isLocked ? '🔒 production' : '◇ staged only'}</span>
                <span>target {module.targetGrade}</span>
              </div>
            </article>
          )
        })}
      </div>

      <div className="simulator-note transition-colors duration-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
        <span aria-hidden="true">i</span>
        <p>
          Staged GPA assumes the selected grade for every unmerged module. Your
          live pipeline stays untouched—experiment until shiok.
        </p>
      </div>
    </section>
  )
}
