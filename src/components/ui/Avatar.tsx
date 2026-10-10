import clsx from 'clsx'
import { fileUrl } from '@/lib/api'
import { initials } from '@/lib/format'

export function Avatar({
  name,
  src,
  size = 'md',
}: {
  name: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-base', xl: 'h-20 w-20 text-xl' }
  const url = fileUrl(src)
  return url ? (
    <img src={url} alt="" className={clsx('shrink-0 rounded-full object-cover', sizes[size])} />
  ) : (
    <span
      className={clsx('grid shrink-0 place-items-center rounded-full bg-navy font-semibold text-white', sizes[size])}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}
