export interface BreadcrumbItem {
  label: string
  onClick: () => void
}

interface BreadcrumbsProps {
  ancestors: BreadcrumbItem[]
  current: string
}

const breadcrumbTextClass =
  'font-mono text-[11px] font-extrabold uppercase tracking-[1.2px]'

export function Breadcrumbs({ ancestors, current }: BreadcrumbsProps) {
  return (
    <nav aria-label="Academic directory">
      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
        {ancestors.map((item) => (
          <li className="flex items-center gap-2" key={item.label}>
            <button
              className={`${breadcrumbTextClass} cursor-pointer text-blue-600 transition-colors hover:text-blue-400 hover:underline dark:text-blue-400`}
              type="button"
              onClick={item.onClick}
            >
              {item.label}
            </button>
            <span className="text-slate-400 dark:text-slate-600" aria-hidden="true">/</span>
          </li>
        ))}
        <li
          className={`${breadcrumbTextClass} text-slate-500 dark:text-slate-400`}
          aria-current="page"
        >
          {current}
        </li>
      </ol>
    </nav>
  )
}
