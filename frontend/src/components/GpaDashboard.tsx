import type { Module } from '@kiasucode/shared'

import { formatGpa } from '../utils/gpa'

interface GpaDashboardProps {
  currentGpa: number
  earnedCredits: number
  targetGpa: number
  modules: Module[]
}

export function GpaDashboard({
  currentGpa,
  earnedCredits,
  targetGpa,
  modules,
}: GpaDashboardProps) {
  const completed = modules.filter((module) => module.status === 'merged').length
  const cards = [
    {
      label: 'Current cumulative GPA',
      value: formatGpa(currentGpa),
      detail: `${completed} of ${modules.length} modules merged`,
      code: 'gpa.now',
      accent: true,
    },
    {
      label: 'Total earned credits',
      value: String(earnedCredits),
      unit: 'CU',
      detail: 'Verified academic commits',
      code: 'credits.sum',
    },
    {
      label: 'Projected target GPA',
      value: formatGpa(targetGpa),
      detail: `${Math.round((targetGpa / 4) * 100)}% of max build score`,
      code: 'gpa.target',
    },
  ]

  return (
    <section className="metric-grid" aria-label="Academic build metrics">
      {cards.map((card) => (
        <article
          className={`metric-card${card.accent ? ' metric-card--accent' : ''}`}
          key={card.code}
        >
          <div className="metric-card__topline">
            <span>{card.label}</span>
            <code>{card.code}</code>
          </div>
          <div className="metric-card__value-row">
            <strong>{card.value}</strong>
            {card.unit ? <span>{card.unit}</span> : null}
          </div>
          <div className="metric-card__footer">
            <span>{card.detail}</span>
            <span aria-hidden="true">↗</span>
          </div>
        </article>
      ))}
    </section>
  )
}
