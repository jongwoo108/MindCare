import bgImage from '../assets/background.png'
import StarField from './StarField'

export default function SceneBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* ── 1. 배경 이미지 ── */}
      <img
        src={bgImage}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center"
        draggable={false}
      />

      {/* ── 2. 미세 어둠 오버레이 (채팅 UI 가독성 확보) ── */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,6,18,0.25)' }}
      />

      {/* ── 3. 별 반짝임 레이어 ── */}
      <StarField count={120} />

      {/* ── 4. 수면 shimmer ── */}
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

      {/* ── 5. 하단 페이드 (입력창 배경 자연스럽게) ── */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: '18%',
          background: 'linear-gradient(to bottom, transparent, rgba(0,4,14,0.55))',
        }}
      />

      {/* ── 6. 비네팅 ── */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 110% 110% at 50% 50%,
            transparent 45%, rgba(0,3,12,0.4) 100%)`,
        }}
      />
    </div>
  )
}
