interface Props {
  reflection?: boolean
}

export default function TreeSilhouette({ reflection = false }: Props) {
  const wrapStyle: React.CSSProperties = reflection
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        transform: 'scaleY(-1)',
        transformOrigin: 'top',
        opacity: 0.28,
        filter: 'blur(2px)',
      }
    : {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
      }

  // True black silhouette — must contrast strongly against navy sky
  const C = '#000913'   // silhouette color

  return (
    <div style={wrapStyle}>
      <svg
        viewBox="0 0 1440 260"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMax meet"
        style={{ display: 'block', width: '100%' }}
      >
        {/* solid ground */}
        <rect x="0" y="210" width="1440" height="50" fill={C} />

        {/* ── Far-left cluster ── */}
        <polygon points="0,210 18,110 36,210"    fill={C} />
        <polygon points="3,165 18,75 33,165"     fill={C} />
        <polygon points="6,130 18,48 30,130"     fill={C} />

        <polygon points="32,210 52,120 72,210"   fill={C} />
        <polygon points="36,172 52,88 68,172"    fill={C} />
        <polygon points="39,138 52,60 65,138"    fill={C} />
        <rect x="49" y="210" width="6" height="28" fill={C} />

        <polygon points="70,210 88,148 106,210"  fill={C} />
        <polygon points="73,175 88,118 103,175"  fill={C} />
        <rect x="85" y="210" width="6" height="28" fill={C} />

        {/* low bush */}
        <ellipse cx="22"  cy="212" rx="28" ry="14" fill={C} />

        {/* ── Left cluster ── */}
        <polygon points="130,210 155,98  180,210"  fill={C} />
        <polygon points="135,160 155,68  175,160"  fill={C} />
        <polygon points="140,126 155,40  170,126"  fill={C} />
        <rect x="152" y="210" width="6" height="28" fill={C} />

        <polygon points="182,210 200,135 218,210"  fill={C} />
        <polygon points="185,168 200,108 215,168"  fill={C} />
        <rect x="197" y="210" width="6" height="28" fill={C} />

        <polygon points="215,210 230,150 245,210"  fill={C} />
        <rect x="227" y="210" width="6" height="28" fill={C} />

        {/* ── Center-left ── */}
        <polygon points="330,210 358,88  386,210"  fill={C} />
        <polygon points="335,155 358,58  381,155"  fill={C} />
        <polygon points="340,120 358,30  376,120"  fill={C} />
        <rect x="355" y="210" width="6" height="28" fill={C} />

        <polygon points="388,210 406,130 424,210"  fill={C} />
        <polygon points="391,162 406,103 421,162"  fill={C} />
        <rect x="403" y="210" width="6" height="28" fill={C} />

        {/* ── Sparse center (leave gap for moon reflection column) ── */}
        <polygon points="530,210 548,148 566,210"  fill={C} />
        <polygon points="533,172 548,118 563,172"  fill={C} />
        <rect x="545" y="210" width="6" height="28" fill={C} />

        {/* gap ~580–860 for moon reflection */}

        <polygon points="860,210 876,155 892,210"  fill={C} />
        <polygon points="862,178 876,128 890,178"  fill={C} />
        <rect x="873" y="210" width="6" height="28" fill={C} />

        {/* ── Center-right ── */}
        <polygon points="920,210 948,90  976,210"  fill={C} />
        <polygon points="925,152 948,60  971,152"  fill={C} />
        <polygon points="930,118 948,32  966,118"  fill={C} />
        <rect x="945" y="210" width="6" height="28" fill={C} />

        <polygon points="978,210 996,132 1014,210" fill={C} />
        <polygon points="981,162 996,105 1011,162" fill={C} />
        <rect x="993" y="210" width="6" height="28" fill={C} />

        <polygon points="1018,210 1033,148 1048,210" fill={C} />
        <rect x="1030" y="210" width="6" height="28" fill={C} />

        {/* ── Right cluster ── */}
        <polygon points="1130,210 1158,92  1186,210" fill={C} />
        <polygon points="1135,154 1158,62  1181,154" fill={C} />
        <polygon points="1140,120 1158,34  1176,120" fill={C} />
        <rect x="1155" y="210" width="6" height="28" fill={C} />

        <polygon points="1188,210 1206,130 1224,210" fill={C} />
        <polygon points="1191,162 1206,103 1221,162" fill={C} />
        <rect x="1203" y="210" width="6" height="28" fill={C} />

        <polygon points="1228,210 1248,95  1268,210" fill={C} />
        <polygon points="1232,155 1248,65  1264,155" fill={C} />
        <polygon points="1236,122 1248,38  1260,122" fill={C} />
        <rect x="1245" y="210" width="6" height="28" fill={C} />

        <polygon points="1272,210 1288,140 1304,210" fill={C} />
        <rect x="1285" y="210" width="6" height="28" fill={C} />

        {/* ── Far-right cluster ── */}
        <polygon points="1340,210 1362,100 1384,210" fill={C} />
        <polygon points="1344,160 1362,70  1380,160" fill={C} />
        <polygon points="1348,126 1362,42  1376,126" fill={C} />
        <rect x="1359" y="210" width="6" height="28" fill={C} />

        <polygon points="1388,210 1406,125 1424,210" fill={C} />
        <polygon points="1391,160 1406,98  1421,160" fill={C} />
        <rect x="1403" y="210" width="6" height="28" fill={C} />

        <polygon points="1426,210 1440,138 1440,210" fill={C} />

        {/* bush right */}
        <ellipse cx="1420" cy="212" rx="26" ry="13" fill={C} />

        {/* ground baseline */}
        <rect x="0" y="210" width="1440" height="50" fill={C} />
      </svg>
    </div>
  )
}
