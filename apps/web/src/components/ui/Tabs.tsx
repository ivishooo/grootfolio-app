interface TabItem {
  value: string
  label: string
  icon?: string
}

interface TabsProps {
  items: TabItem[]
  selected: string
  onChange: (value: string) => void
  columns?: 2 | 3 | 4
}

export function Tabs({ items, selected, onChange, columns = 4 }: TabsProps) {
  const gridCols = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' } as const

  return (
    <div className={`grid grid-cols-2 ${gridCols[columns]} gap-3`}>
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          className={`rounded-2xl border p-5 text-center transition-colors ${
            selected === item.value
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
              : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800'
          }`}
        >
          {item.icon && <div className="text-2xl">{item.icon}</div>}
          <div className={`${item.icon ? 'mt-1' : ''} text-sm font-medium`}>{item.label}</div>
        </button>
      ))}
    </div>
  )
}
