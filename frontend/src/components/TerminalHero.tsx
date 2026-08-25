import { useState, type FormEvent } from 'react'

import { formatGpa } from '../utils/gpa'

interface TerminalHeroProps {
  currentGpa: number
  mergedModules: number
  totalModules: number
  semester: string
}

interface TerminalLine {
  command: string
  output: string
}

export function TerminalHero({
  currentGpa,
  mergedModules,
  totalModules,
  semester,
}: TerminalHeroProps) {
  const [command, setCommand] = useState('')
  const [history, setHistory] = useState<TerminalLine[]>([])

  const execute = (rawCommand: string) => {
    const normalized = rawCommand.trim().toLowerCase()
    if (!normalized) return

    const outputs: Record<string, string> = {
      status: `build healthy · ${mergedModules}/${totalModules} modules merged`,
      gpa: `HEAD → cumulative/${formatGpa(currentGpa)} · checks passing`,
      pipeline: `${totalModules - mergedModules} academic commits still in flight`,
      help: 'commands: status · gpa · pipeline · clear',
    }

    if (normalized === 'clear') {
      setHistory([])
      setCommand('')
      return
    }

    setHistory((lines) => [
      ...lines.slice(-2),
      {
        command: normalized,
        output: outputs[normalized] ?? `command not found: ${normalized} · try help`,
      },
    ])
    setCommand('')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    execute(command)
  }

  return (
    <div className="terminal-card" aria-label="Interactive academic terminal">
      <div className="terminal-card__bar">
        <div className="terminal-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span>kiasu@academic-build: ~</span>
        <span className="terminal-live"><i /> live</span>
      </div>
      <div className="terminal-card__body">
        <div className="terminal-command">
          <span className="terminal-prompt">$</span>
          <span>kiasu status --verbose</span>
        </div>
        <div className="terminal-output terminal-output--status">
          <span>✓</span>
          <div>
            <strong>Academic build is healthy</strong>
            <p>No critical regressions detected. Steady lah.</p>
          </div>
        </div>
        <div className="terminal-grid">
          <div><span>BRANCH</span><strong>{semester}</strong></div>
          <div><span>HEAD</span><strong>week-08</strong></div>
          <div><span>GPA</span><strong>{formatGpa(currentGpa)}</strong></div>
        </div>
        <div className="terminal-log">
          <p><span>●</span> {mergedModules} modules merged to main</p>
          <p><span>◐</span> {totalModules - mergedModules} commits in pipeline</p>
          {history.map((line, index) => (
            <div className="terminal-history" key={`${line.command}-${index}`}>
              <p><span>$</span> {line.command}</p>
              <p className="terminal-history__output">{line.output}</p>
            </div>
          ))}
        </div>
        <form className="terminal-input" onSubmit={handleSubmit}>
          <span>$</span>
          <input
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder="type help..."
            aria-label="Terminal command"
          />
          <button type="submit">run ↵</button>
        </form>
        <div className="terminal-shortcuts" aria-label="Quick terminal commands">
          {['status', 'gpa', 'pipeline'].map((item) => (
            <button type="button" key={item} onClick={() => execute(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
