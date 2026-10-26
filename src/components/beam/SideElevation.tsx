import { BEAM_MASK_DEG, type BeamTrack, type Pointing } from "@/lib/beam";

const FONT = '"JetBrains Mono", monospace';
const W = 320;
const H = 190;
const BASE_X = 160;
const BASE_Y = 152;
const RAY = 112;

function tipFor(elDeg: number) {
  const a = (elDeg * Math.PI) / 180;
  return { x: BASE_X + Math.cos(a) * RAY, y: BASE_Y - Math.sin(a) * RAY };
}

/**
 * A side section through the sky: the terminal on the ground, and the beam
 * tilted up at the serving satellite's true elevation. Azimuth is not shown.
 */
export function SideElevation({
  target,
  pointing,
  next,
  nextEl,
}: {
  target: BeamTrack | null;
  pointing: Pointing | null;
  next: BeamTrack | null;
  nextEl: number | null;
}) {
  const el = pointing?.el ?? 0;
  const tip = tipFor(el);
  const nextTip = nextEl !== null ? tipFor(nextEl) : null;
  const tone = "#3ddbd9";
  const px = -Math.sin((el * Math.PI) / 180);
  const py = Math.cos((el * Math.PI) / 180) * -1;
  const spread = 10;
  const arcR = 44;
  const arcX = BASE_X + Math.cos((el * Math.PI) / 180) * arcR;
  const arcY = BASE_Y - Math.sin((el * Math.PI) / 180) * arcR;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#050a13] p-2.5">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        role="img"
        aria-label={
          target
            ? `Side view: the flat terminal on the ground, beam raised ${el.toFixed(0)} degrees above the horizon towards ${target.name}.`
            : "Side view: the flat terminal on the ground, no link."
        }
      >
        <defs>
          <linearGradient id="se-beam" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={tone} stopOpacity="0.45" />
            <stop offset="100%" stopColor={tone} stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="se-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#071120" />
            <stop offset="100%" stopColor="#050a13" />
          </linearGradient>
        </defs>

        <rect width={W} height={H} fill="url(#se-sky)" rx="8" />

        {/* elevation arc ticks */}
        {[0, 30, 60, 90].map((a) => {
          const r0 = 38;
          const r1 = 47;
          const rad = (a * Math.PI) / 180;
          return (
            <line
              key={a}
              x1={BASE_X + Math.cos(rad) * r0}
              y1={BASE_Y - Math.sin(rad) * r0}
              x2={BASE_X + Math.cos(rad) * r1}
              y2={BASE_Y - Math.sin(rad) * r1}
              stroke="rgba(148,176,224,0.3)"
            />
          );
        })}

        {/* zenith line */}
        <line
          x1={BASE_X}
          y1={BASE_Y - 6}
          x2={BASE_X}
          y2="24"
          stroke="rgba(148,176,224,0.3)"
          strokeDasharray="3 5"
        />
        <text x={BASE_X + 4} y="20" fill="#5f7595" style={{ fontFamily: FONT, fontSize: 7.4, letterSpacing: 1 }}>
          ZENITH
        </text>

        {/* next satellite ghost */}
        {nextTip && next && (
          <g opacity="0.75">
            <line
              x1={BASE_X}
              y1={BASE_Y}
              x2={nextTip.x}
              y2={nextTip.y}
              stroke="#fbbf24"
              strokeOpacity="0.45"
              strokeDasharray="3 5"
            />
            <circle cx={nextTip.x} cy={nextTip.y} r="3" fill="none" stroke="#fbbf24" strokeOpacity="0.8" />
            <text
              x={Math.min(W - 6, nextTip.x + 6)}
              y={nextTip.y - 6}
              fill="#fbbf24"
              fillOpacity="0.8"
              textAnchor={nextTip.x > W - 70 ? "end" : "start"}
              style={{ fontFamily: FONT, fontSize: 7.2, letterSpacing: 0.8 }}
            >
              NEXT
            </text>
          </g>
        )}

        {/* beam */}
        {target && (
          <g>
            <polygon
              points={`${BASE_X - 9},${BASE_Y - 7} ${tip.x + px * spread},${tip.y + py * spread} ${tip.x - px * spread},${tip.y - py * spread} ${BASE_X + 9},${BASE_Y - 7}`}
              fill="url(#se-beam)"
            />
            <line
              x1={BASE_X}
              y1={BASE_Y - 6}
              x2={tip.x}
              y2={tip.y}
              stroke={tone}
              strokeWidth="1.5"
              strokeOpacity="0.9"
            />
            <circle cx={tip.x} cy={tip.y} r="8" fill="none" stroke={tone} strokeOpacity="0.5" />
            <circle cx={tip.x} cy={tip.y} r="3.4" fill={tone} />
            <text
              x={Math.min(W - 6, tip.x + 9)}
              y={tip.y + 3}
              fill="#7ee7e2"
              textAnchor={tip.x > W - 100 ? "end" : "start"}
              style={{ fontFamily: FONT, fontSize: 8.2, letterSpacing: 0.5 }}
            >
              {target.name}
            </text>
          </g>
        )}

        {/* elevation arc + label */}
        {target && (
          <>
            <path
              d={`M ${BASE_X + arcR} ${BASE_Y} A ${arcR} ${arcR} 0 0 0 ${arcX} ${arcY}`}
              fill="none"
              stroke="#7ee7e2"
              strokeOpacity="0.55"
              strokeDasharray="2 4"
            />
            <text
              x={BASE_X + Math.cos((el * Math.PI) / 360) * 63 + 2}
              y={BASE_Y - Math.sin((el * Math.PI) / 360) * 63 + 3}
              fill="#7ee7e2"
              style={{ fontFamily: FONT, fontSize: 8.4 }}
            >
              {el.toFixed(0)}°
            </text>
          </>
        )}

        {/* ground */}
        <line x1="8" y1={BASE_Y} x2={W - 8} y2={BASE_Y} stroke="rgba(148,176,224,0.3)" />
        {Array.from({ length: 16 }, (_, i) => (
          <line
            key={i}
            x1={8 + i * 20}
            y1={BASE_Y}
            x2={2 + i * 20}
            y2={BASE_Y + 7}
            stroke="rgba(148,176,224,0.14)"
          />
        ))}
        <rect x="8" y={BASE_Y + 8} width={W - 16} height="26" fill="#060d17" />

        {/* terminal */}
        <g>
          <path d={`M ${BASE_X} ${BASE_Y - 6} L ${BASE_X} ${BASE_Y + 5}`} stroke="#8297aa" strokeWidth="3" />
          <path d={`M ${BASE_X - 14} ${BASE_Y + 6} L ${BASE_X + 14} ${BASE_Y + 6}`} stroke="#8297aa" strokeWidth="2" />
          <rect x={BASE_X - 24} y={BASE_Y - 10} width="48" height="6" rx="3" fill="#d0e4ea" stroke="#7ee7e2" strokeWidth="1" />
          <line x1={BASE_X - 20} y1={BASE_Y - 7} x2={BASE_X + 20} y2={BASE_Y - 7} stroke="#3ddbd9" strokeOpacity="0.55" />
        </g>
        <text
          x={W - 10}
          y={BASE_Y + 25}
          textAnchor="end"
          fill="#5f7595"
          style={{ fontFamily: FONT, fontSize: 7.2, letterSpacing: 0.6 }}
        >
          SIDE SECTION · AZIMUTH NOT SHOWN
        </text>
        <text x="10" y={BASE_Y + 25} fill="#f87171" fillOpacity="0.75" style={{ fontFamily: FONT, fontSize: 7.2, letterSpacing: 0.6 }}>
          MASK {BEAM_MASK_DEG}°
        </text>
      </svg>
    </div>
  );
}
