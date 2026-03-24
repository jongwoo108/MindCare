interface RiskBadgeProps {
  level: number
  showLabel?: boolean
}

function getRiskConfig(level: number) {
  if (level >= 7) return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', label: '고위험' }
  if (level >= 4) return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', label: '주의' }
  return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: '안정' }
}

export default function RiskBadge({ level, showLabel = false }: RiskBadgeProps) {
  const { bg, text, border, label } = getRiskConfig(level)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${bg} ${text} ${border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${level >= 7 ? 'bg-red-500' : level >= 4 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
      {showLabel ? `${label} ${level}/10` : `${level}/10`}
    </span>
  )
}
