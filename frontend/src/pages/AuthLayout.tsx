import type { ReactNode } from 'react'
import { Logo } from '../components/Logo'

/** Split screen: form on the left, a stack of carbon-copy ticket forms on the right. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[380px]">{children}</div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-accent lg:block" aria-hidden>
        <CarbonStack />
      </div>
    </div>
  )
}

function CarbonStack() {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-12">
      <div className="relative h-[460px] w-[360px]">
        <Sheet className="rotate-[7deg] translate-x-10 translate-y-6 bg-[#f7c6d2]" lines={4} faded />
        <Sheet className="rotate-[3deg] translate-x-5 translate-y-3 bg-[#f6e6a2]" lines={5} faded />
        <div className="absolute inset-0 -rotate-[2deg] rounded-[10px] bg-white p-7 text-[#1d2430] shadow-[0_30px_60px_-20px_rgb(8_20_80/0.55)]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#8a929e]">HD-2187</span>
            <span className="rounded-full bg-[#e7ecfd] px-2.5 py-0.5 text-[12px] font-medium text-[#2346d8]">In progress</span>
          </div>
          <p className="mt-3 text-[20px] leading-snug font-semibold tracking-[-0.015em]">Checkout button does nothing on Safari</p>
          <div className="my-5 h-[10px] bg-[radial-gradient(circle,#2346d8_3.5px,transparent_4px)] bg-[length:14px_10px] bg-repeat-x" />
          <div className="space-y-3 text-[14px] leading-relaxed">
            <div className="flex gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f6e6cf] text-[11px] font-semibold text-[#7a4c10]">
                LF
              </span>
              <p className="rounded-2xl rounded-tl-md border border-[#dcdfe1] px-3 py-2">
                Here's what I see after tapping it. Screenshot attached.
              </p>
            </div>
            <div className="ml-10 h-24 rounded-lg border border-[#dcdfe1] bg-[linear-gradient(135deg,#eceee9,#f5f6f3)]" />
            <div className="flex flex-row-reverse gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#dfe6fb] text-[11px] font-semibold text-[#2a3f8f]">
                JR
              </span>
              <p className="rounded-2xl rounded-tr-md bg-[#2346d8] px-3 py-2 text-white">Reproduced. A fix is rolling out now.</p>
            </div>
          </div>
        </div>
      </div>
      <p className="absolute right-12 bottom-10 left-12 max-w-md text-[22px] leading-snug font-medium tracking-[-0.01em] text-white/95">
        Every request gets a ticket, a person, and a live conversation until it's fixed.
      </p>
    </div>
  )
}

function Sheet({ className, lines, faded }: { className: string; lines: number; faded?: boolean }) {
  return (
    <div className={`absolute inset-0 rounded-[10px] p-7 shadow-[0_20px_40px_-24px_rgb(8_20_80/0.5)] ${className}`}>
      <div className={faded ? 'opacity-30' : ''}>
        <div className="h-3 w-16 rounded bg-black/30" />
        <div className="mt-4 h-4 w-56 rounded bg-black/30" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: lines }, (_, i) => (
            <div key={i} className="h-2.5 rounded bg-black/20" style={{ width: `${90 - i * 9}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
