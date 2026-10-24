import { Search, X } from 'lucide-react'

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search by subject or ticket number',
}: {
  value: string
  onChange(v: string): void
  placeholder?: string
}) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search tickets"
        className="h-10 w-full rounded-lg border border-rule-strong bg-surface pr-8 pl-9 text-sm text-ink placeholder:text-ink-3 hover:border-ink-3 focus:border-accent focus:ring-3 focus:ring-accent/15 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute top-1/2 right-2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded text-ink-3 hover:text-ink"
          aria-label="Clear search"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
