import StarField from './StarField'
import TreeSilhouette from './TreeSilhouette'

// Horizon sits at 55% from top
const HORIZON = 55

export default function SceneBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* ── 1. Sky — deep navy with rich gradient ── */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            to bottom,
            #010610 0%,
            #020c1e 18%,
            #041428 36%,
            #071c38 ${HORIZON - 10}%,
            #0d2548 ${HORIZON - 2}%,
            #0a1e3a ${HORIZON}%
          )`,
        }}
      />

      {/* ── 2. Horizon atmospheric glow ── */}
      <div
        className="absolute"
        style={{
          top: `${HORIZON - 8}%`,
          left: 0,
          right: 0,
          height: '16%',
          background: `radial-gradient(ellipse 80% 60% at 50% 100%,
            rgba(30,70,130,0.35) 0%,
            rgba(10,30,70,0.15) 55%,
            transparent 100%)`,
        }}
      />

      {/* ── 3. Stars (top 55%) ── */}
      <StarField count={220} />

      {/* ── 4. Crescent moon ── */}
      <div
        className="absolute"
        style={{ top: '8%', left: '55%', width: 56, height: 56 }}
      >
        {/* outer glow rings */}
        <div style={{
          position: 'absolute',
          inset: -22,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(240,230,170,0.06) 30%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute',
          inset: -10,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(240,230,170,0.10) 40%, transparent 70%)',
        }} />
        {/* moon body */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 38% 38%, #f5ecc8, #e8d898 55%, #c8b870)',
          boxShadow: '0 0 18px 4px rgba(240,225,150,0.25)',
        }} />
        {/* shadow circle to carve crescent */}
        <div style={{
          position: 'absolute',
          top: '-8%',
          left: '20%',
          width: '88%',
          height: '88%',
          borderRadius: '50%',
          background: '#041428',
        }} />
      </div>

      {/* ── 5. Water — darker below horizon ── */}
      <div
        className="absolute"
        style={{
          top: `${HORIZON}%`,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(
            to bottom,
            #08192e 0%,
            #060f20 35%,
            #040c1a 70%,
            #020810 100%
          )`,
        }}
      />

      {/* ── 6. Moon reflection column in water ── */}
      <div
        className="absolute"
        style={{
          top: `${HORIZON}%`,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 44,
          bottom: 0,
          background: `linear-gradient(
            to bottom,
            rgba(220,200,130,0.18) 0%,
            rgba(200,180,110,0.08) 40%,
            transparent 80%
          )`,
          filter: 'blur(4px)',
        }}
      />

      {/* ── 7. Water shimmer lines ── */}
      {[8, 14, 20, 27, 34, 42].map((offset, i) => (
        <div
          key={i}
          className="animate-water-shimmer"
          style={{
            position: 'absolute',
            top: `${HORIZON + offset}%`,
            left: `${15 + i * 2}%`,
            right: `${15 + i * 2}%`,
            height: 1,
            borderRadius: 2,
            background: `rgba(180,210,255,${0.05 - i * 0.005})`,
            animationDelay: `${i * 0.8}s`,
            animationDuration: `${3.5 + i * 0.4}s`,
          }}
        />
      ))}

      {/* ── 8. Horizon divider — dark tree-line band ── */}
      <div
        className="absolute"
        style={{
          top: `${HORIZON - 1}%`,
          left: 0,
          right: 0,
          height: '3%',
          background: `linear-gradient(to bottom, transparent, rgba(0,5,15,0.6))`,
        }}
      />

      {/* ── 9. Tree silhouette (anchored at horizon) ── */}
      <div
        style={{
          position: 'absolute',
          top: `${HORIZON - 16}%`,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        <TreeSilhouette reflection={false} />
      </div>

      {/* ── 10. Tree reflection (just below horizon) ── */}
      <div
        style={{
          position: 'absolute',
          top: `${HORIZON}%`,
          left: 0,
          right: 0,
          height: '20%',
          overflow: 'hidden',
        }}
      >
        <TreeSilhouette reflection={true} />
      </div>

      {/* ── 11. Vignette overlay for depth ── */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 100% 100% at 50% 50%,
            transparent 40%,
            rgba(0,4,12,0.45) 100%)`,
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
