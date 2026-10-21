import { brand } from '../config/brand'

export function BrandMark() {
  return <span className="font-mono text-[13px] font-medium tracking-[0.08em] text-ink">{brand.name}</span>
}
