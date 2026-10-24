import clsx from 'clsx'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={clsx('shrink-0', className)} aria-hidden>
      <path
        fill="var(--accent)"
        d="M6 4h20a2 2 0 0 1 2 2v7a3 3 0 0 0 0 6v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a3 3 0 0 0 0-6V6a2 2 0 0 1 2-2Z"
      />
      <path stroke="var(--accent-ink)" strokeWidth="2.4" strokeLinecap="round" d="M10 12h12M10 17h8" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      <LogoMark className="size-7" />
      <span className="text-[19px] font-semibold tracking-[-0.03em] text-ink">Relay</span>
    </span>
  )
}
