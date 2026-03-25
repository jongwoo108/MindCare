interface Props {
  reflection?: boolean
}

export default function TreeSilhouette({ reflection = false }: Props) {
  const style: React.CSSProperties = reflection
    ? {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        transform: 'scaleY(-1)',
        transformOrigin: 'top',
        opacity: 0.35,
        filter: 'blur(1.5px)',
      }
    : {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
      }

  return (
    <div style={style}>
      <svg
        viewBox="0 0 1440 220"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMax meet"
        style={{ display: 'block', width: '100%' }}
      >
        {/* Ground fill */}
        <rect x="0" y="180" width="1440" height="40" fill="#060d18" />

        {/* --- Left cluster --- */}
        {/* Tall pine L1 */}
        <polygon points="60,185 80,100 100,185" fill="#080f1c" />
        <polygon points="65,150 80,70 95,150" fill="#080f1c" />
        <polygon points="68,120 80,40 92,120" fill="#0a1220" />
        {/* Trunk */}
        <rect x="77" y="185" width="6" height="20" fill="#060d18" />

        {/* Tall pine L2 */}
        <polygon points="110,185 135,95 160,185" fill="#080f1c" />
        <polygon points="115,148 135,65 155,148" fill="#0a1220" />
        <polygon points="120,115 135,35 150,115" fill="#0c1424" />
        <rect x="132" y="185" width="6" height="20" fill="#060d18" />

        {/* Mid pine L3 */}
        <polygon points="155,185 170,120 185,185" fill="#080f1c" />
        <polygon points="158,155 170,90 182,155" fill="#0a1220" />
        <rect x="167" y="185" width="6" height="20" fill="#060d18" />

        {/* Short bush L */}
        <ellipse cx="40" cy="185" rx="30" ry="18" fill="#060d18" />
        <ellipse cx="15" cy="188" rx="18" ry="12" fill="#060d18" />

        {/* --- Center-left --- */}
        <polygon points="260,185 285,80 310,185" fill="#080f1c" />
        <polygon points="265,145 285,50 305,145" fill="#0a1220" />
        <polygon points="270,112 285,28 300,112" fill="#0c1424" />
        <rect x="282" y="185" width="6" height="20" fill="#060d18" />

        <polygon points="310,185 328,118 346,185" fill="#080f1c" />
        <polygon points="314,152 328,88 342,152" fill="#0a1220" />
        <rect x="325" y="185" width="6" height="20" fill="#060d18" />

        {/* --- Center (sparse for sky reflection) --- */}
        <polygon points="580,185 600,100 620,185" fill="#080f1c" />
        <polygon points="584,148 600,68 616,148" fill="#0a1220" />
        <rect x="597" y="185" width="6" height="20" fill="#060d18" />

        <polygon points="640,185 655,130 670,185" fill="#080f1c" />
        <polygon points="643,160 655,105 667,160" fill="#0a1220" />
        <rect x="652" y="185" width="6" height="20" fill="#060d18" />

        {/* --- Center-right --- */}
        <polygon points="800,185 825,75 850,185" fill="#080f1c" />
        <polygon points="805,145 825,45 845,145" fill="#0a1220" />
        <polygon points="810,112 825,22 840,112" fill="#0c1424" />
        <rect x="822" y="185" width="6" height="20" fill="#060d18" />

        <polygon points="855,185 872,115 889,185" fill="#080f1c" />
        <polygon points="858,152 872,85 886,152" fill="#0a1220" />
        <rect x="869" y="185" width="6" height="20" fill="#060d18" />

        <polygon points="890,185 905,128 920,185" fill="#080f1c" />
        <polygon points="893,158 905,100 917,158" fill="#0a1220" />
        <rect x="902" y="185" width="6" height="20" fill="#060d18" />

        {/* --- Right cluster --- */}
        <polygon points="1100,185 1125,88 1150,185" fill="#080f1c" />
        <polygon points="1105,148 1125,58 1145,148" fill="#0a1220" />
        <polygon points="1110,115 1125,30 1140,115" fill="#0c1424" />
        <rect x="1122" y="185" width="6" height="20" fill="#060d18" />

        <polygon points="1152,185 1170,112 1188,185" fill="#080f1c" />
        <polygon points="1155,150 1170,82 1185,150" fill="#0a1220" />
        <rect x="1167" y="185" width="6" height="20" fill="#060d18" />

        <polygon points="1195,185 1215,95 1235,185" fill="#080f1c" />
        <polygon points="1199,148 1215,65 1231,148" fill="#0a1220" />
        <polygon points="1203,115 1215,38 1227,115" fill="#0c1424" />
        <rect x="1212" y="185" width="6" height="20" fill="#060d18" />

        <polygon points="1245,185 1260,125 1275,185" fill="#080f1c" />
        <polygon points="1248,158 1260,95 1272,158" fill="#0a1220" />
        <rect x="1257" y="185" width="6" height="20" fill="#060d18" />

        {/* Far right pines */}
        <polygon points="1310,185 1330,90 1350,185" fill="#080f1c" />
        <polygon points="1314,148 1330,60 1346,148" fill="#0a1220" />
        <rect x="1327" y="185" width="6" height="20" fill="#060d18" />

        <polygon points="1360,185 1380,105 1400,185" fill="#080f1c" />
        <polygon points="1364,152 1380,75 1396,152" fill="#0a1220" />
        <rect x="1377" y="185" width="6" height="20" fill="#060d18" />

        <polygon points="1405,185 1420,125 1440,185" fill="#080f1c" />

        {/* Short bushes right */}
        <ellipse cx="1420" cy="185" rx="28" ry="16" fill="#060d18" />
        <ellipse cx="1390" cy="188" rx="20" ry="12" fill="#060d18" />

        {/* Ground baseline strip */}
        <rect x="0" y="185" width="1440" height="35" fill="#060d18" />
      </svg>
    </div>
  )
}
