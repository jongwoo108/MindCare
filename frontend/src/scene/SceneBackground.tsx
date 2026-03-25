import { useTimeOfDay, type TimeOfDay } from './useTimeOfDay'
import StarField from './StarField'

import bgNight   from '../assets/background.png'
import bgMorning from '../assets/background_morining.png'
// 준비되면 아래 주석 해제
// import bgAfternoon from '../assets/background_afternoon.png'
// import bgEvening   from '../assets/background_evening.png'

// 현재 보유 이미지 매핑 — 없는 시간대는 가장 가까운 것으로 대체
const BG_MAP: Record<TimeOfDay, string> = {
  morning:   bgMorning,
  afternoon: bgMorning,  // TODO: replace with bgAfternoon
  evening:   bgNight,    // TODO: replace with bgEvening
  night:     bgNight,
}

// 시간대별 오버레이 색상 (이미지 위에 덧씌워 분위기 보정)
const OVERLAY: Record<TimeOfDay, string> = {
  morning:   'rgba(255,210,140,0.08)',   // 따뜻한 아침 빛
  afternoon: 'rgba(180,220,255,0.10)',   // 맑은 낮
  evening:   'rgba(180,80,40,0.12)',     // 황혼 주황
  night:     'rgba(0,6,18,0.25)',        // 어두운 밤
}

// 시간대별 별 개수 (낮에는 적고 희미하게, 밤에는 많이)
const STAR_COUNT: Record<TimeOfDay, number> = {
  morning:   30,
  afternoon: 0,
  evening:   80,
  night:     120,
}

export default function SceneBackground() {
  const { period } = useTimeOfDay()

  const currentBg  = BG_MAP[period]
  const prevBg     = period === 'night' ? bgMorning : bgNight  // 간단 전환용

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* ── 1. 이전 이미지 (페이드 아웃 기반 — 항상 렌더) ── */}
      <img
        key={`prev-${period}`}
        src={prevBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center"
        style={{ opacity: 0, transition: 'opacity 3s ease' }}
        draggable={false}
      />

      {/* ── 2. 현재 시간대 이미지 (페이드 인) ── */}
      <img
        key={`curr-${period}`}
        src={currentBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center"
        style={{
          opacity: 1,
          transition: 'opacity 3s ease',
        }}
        draggable={false}
      />

      {/* ── 3. 시간대별 색감 오버레이 ── */}
      <div
        className="absolute inset-0"
        style={{
          background: OVERLAY[period],
          transition: 'background 3s ease',
        }}
      />

      {/* ── 4. 별 (시간대별 밀도) ── */}
      {STAR_COUNT[period] > 0 && <StarField count={STAR_COUNT[period]} />}

      {/* ── 5. 수면 shimmer ── */}
      {[56, 62, 68, 74, 80].map((top, i) => (
        <div
          key={i}
          className="animate-water-shimmer"
          style={{
            position: 'absolute',
            top: `${top}%`,
            left: `${20 + i * 2}%`,
            right: `${20 + i * 2}%`,
            height: 1,
            borderRadius: 2,
            background: `rgba(200,220,255,${0.06 - i * 0.008})`,
            animationDelay: `${i * 0.9}s`,
            animationDuration: `${3 + i * 0.5}s`,
          }}
        />
      ))}

      {/* ── 6. 하단 페이드 ── */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: '18%',
          background: 'linear-gradient(to bottom, transparent, rgba(0,4,14,0.5))',
        }}
      />

      {/* ── 7. 비네팅 ── */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 110% 110% at 50% 50%,
            transparent 45%, rgba(0,3,12,0.38) 100%)`,
        }}
      />
    </div>
  )
}
