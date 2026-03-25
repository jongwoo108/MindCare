import StarField from './StarField'
import TreeSilhouette from './TreeSilhouette'

const HORIZON = 52 // % from top

export default function SceneBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* ── 1. Sky gradient ── */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            to bottom,
            #020810 0%,
            #050d1a 20%,
            #081428 40%,
            #0d1e35 ${HORIZON}%
          )`,
        }}
      />

      {/* ── 2. Stars (top 52%) ── */}
      <StarField count={180} />

      {/* ── 3. Crescent moon ── */}
      <div
        className="absolute"
        style={{ top: '7%', left: '52%', width: 52, height: 52 }}
      >
        {/* bright circle */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 40% 40%, #f0e8c8, #e8d89a)',
            boxShadow: '0 0 28px 6px rgba(240,232,180,0.22)',
          }}
        />
        {/* dark overlay to carve the crescent */}
        <div
          style={{
            position: 'absolute',
            top: '-12%',
            left: '18%',
            width: '90%',
            height: '90%',
            borderRadius: '50%',
            background: '#060d1c',
          }}
        />
      </div>

      {/* ── 4. Moon glow at horizon (lake reflection of moon) ── */}
      <div
        className="absolute"
        style={{
          top: `${HORIZON + 43}%`,
          left: '52%',
          transform: 'translateX(-50%)',
          width: 80,
          height: 14,
          borderRadius: '50%',
          background: 'rgba(230,215,150,0.18)',
          filter: 'blur(8px)',
        }}
      />

      {/* ── 5. Lake / water — bottom 48% ── */}
      <div
        className="absolute"
        style={{
          top: `${HORIZON}%`,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(
            to bottom,
            #0d1e35 0%,
            #091629 40%,
            #060d1c 100%
          )`,
        }}
      />

      {/* ── 6. Water shimmer lines ── */}
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="absolute animate-water-shimmer"
          style={{
            top: `${HORIZON + 4 + i * 4}%`,
            left: '20%',
            right: '20%',
            height: 1,
            borderRadius: 1,
            background: `rgba(255,255,255,${0.025 + i * 0.008})`,
            animationDelay: `${i * 0.7}s`,
            animationDuration: `${3 + i * 0.5}s`,
          }}
        />
      ))}

      {/* ── 7. Tree silhouette — real (sits at horizon baseline) ── */}
      <div
        className="absolute"
        style={{
          top: `${HORIZON - 14}%`,   // let trees extend slightly above horizon
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        <TreeSilhouette reflection={false} />
      </div>

      {/* ── 8. Tree reflection (below horizon) ── */}
      <div
        className="absolute"
        style={{
          top: `${HORIZON}%`,
          left: 0,
          right: 0,
          height: '18%',
        }}
      >
        <TreeSilhouette reflection={true} />
      </div>

      {/* ── 9. Horizon blend line ── */}
      <div
        className="absolute"
        style={{
          top: `${HORIZON - 0.3}%`,
          left: 0,
          right: 0,
          height: 2,
          background: 'rgba(13,30,53,0.9)',
          filter: 'blur(2px)',
        }}
      />
    </div>
  )
}
