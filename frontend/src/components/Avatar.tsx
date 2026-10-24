import clsx from 'clsx'
import { initials } from '../lib/format'

// Muted pairs that hold up in both themes; picked by id so a person keeps their color.
const tones = [
  'bg-[#dfe6fb] text-[#2a3f8f] dark:bg-[#24305a] dark:text-[#b9c7ff]',
  'bg-[#dcefe5] text-[#1f6043] dark:bg-[#183526] dark:text-[#9fdcbd]',
  'bg-[#f6e6cf] text-[#7a4c10] dark:bg-[#3a2a12] dark:text-[#f0c88a]',
  'bg-[#f3dde4] text-[#8a2d48] dark:bg-[#3d1d27] dark:text-[#f4b3c4]',
  'bg-[#e4e0f3] text-[#4a3a8a] dark:bg-[#2a2547] dark:text-[#cbbff5]',
  'bg-[#dbeaee] text-[#205866] dark:bg-[#17323a] dark:text-[#9ad3e0]',
]

export function Avatar({
  name,
  id,
  size = 'md',
  className,
}: {
  name: string
  id: number
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}) {
  const dims = { xs: 'size-5 text-[9px]', sm: 'size-7 text-[11px]', md: 'size-8 text-[12px]', lg: 'size-11 text-[15px]' }[size]
  return (
    <span
      aria-hidden
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight select-none',
        tones[id % tones.length],
        dims,
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
