interface RiskBadgeProps {
  level: number
}

function getRiskConfig(level: number) {
  if (level >= 9) return { label: '즉각 지원 필요', dot: 'bg-red-400', style: 'bg-red-950/40 text-red-300 border-red-900/40' }
  if (level >= 7) return { label: '위기 상태', dot: 'bg-red-400', style: 'bg-red-950/40 text-red-300 border-red-900/40' }
  if (level >= 4) return { label: '주의 필요', dot: 'bg-amber-400', style: 'bg-amber-950/40 text-amber-300 border-amber-900/40' }
  return { label: '안정', dot: 'bg-emerald-400', style: 'bg-emerald-950/30 text-emerald-400 border-emerald-900/30' }
}

export default function RiskBadge({ level }: RiskBadgeProps) {
  const { label, dot, style } = getRiskConfig(level)
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}
