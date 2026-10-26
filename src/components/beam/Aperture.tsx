import { useEffect, useRef } from "react";
import { arrayFactorDb, zenithAngle } from "@/lib/beam";

const FONT = '"JetBrains Mono", monospace';
const FRINGES = 3.1;
const COLS = 40;
const ROWS = 32;
const CW = 960;
const CH = 600;

const LOW: [number, number, number] = [11, 39, 64];
const MID: [number, number, number] = [61, 219, 217];
const HIGH: [number, number, number] = [222, 255, 252];

function mix(a: readonly number[], b: readonly number[], f: number) {
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f] as const;
}

function rampColor(t: number) {
  const v = t < 0 ? 0 : t > 1 ? 1 : t;
  return v < 0.62 ? mix(LOW, MID, v / 0.62) : mix(MID, HIGH, (v - 0.62) / 0.38);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function ArrayAperture({
  el,
  az,
  time,
}: {
  el: number;
  az: number;
  time: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(CW * dpr)) {
      canvas.width = Math.round(CW * dpr);
      canvas.height = Math.round(CH * dpr);
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, CW, CH);

    const padX = 52;
    const padY = 44;
    const innerW = CW - padX * 2;
    const innerH = CH - padY * 2;

    // PCB
    const bg = ctx.createLinearGradient(0, 0, 0, CH);
    bg.addColorStop(0, "#0a1826");
    bg.addColorStop(1, "#060e19");
    roundRect(ctx, 8, 8, CW - 16, CH - 16, 22);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = "rgba(148,176,224,0.16)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const theta = (zenithAngle(el) * Math.PI) / 180;
    const k = Math.sin(theta);
    const azR = (az * Math.PI) / 180;
    const ex = Math.sin(azR);
    const ny = Math.cos(azR);
    const pxd = innerW / COLS;
    const pyd = innerH / ROWS;
    const radius = Math.min(pxd, pyd) * 0.36;
    const sweep = (time * 0.07) % 1;

    // Bucket elements by quantised colour so the whole aperture needs ~60 fills.
    const buckets = new Map<string, Path2D>();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const u = (c / (COLS - 1)) * 2 - 1;
        const v = 1 - (r / (ROWS - 1)) * 2;
        // Progressive phase along the beam direction: flat at zenith, steep at the
        // horizon. The fringes are the wavefronts; their spacing is the steer angle.
        const phase = (u * ex + v * ny) * k * FRINGES - sweep;
        const wave = 0.5 + 0.5 * Math.cos(phase * Math.PI * 2);
        const rgb = rampColor(wave * 0.9);
        const level = 0.3 + 0.7 * wave;
        const key = `${Math.round(rgb[0] / 12) * 12},${Math.round(rgb[1] / 12) * 12},${Math.round(rgb[2] / 12) * 12},${(Math.round(level * 16) / 16).toFixed(3)}`;
        let path = buckets.get(key);
        if (!path) {
          path = new Path2D();
          buckets.set(key, path);
        }
        const x = padX + (c + (r % 2) * 0.5) * pxd + pxd * 0.25;
        const y = padY + r * pyd + pyd * 0.5;
        path.moveTo(x + radius, y);
        path.arc(x, y, radius, 0, Math.PI * 2);
      }
    }

    for (const [key, path] of buckets) {
      const [r, g, b, level] = key.split(",").map(Number);
      ctx.fillStyle = `rgba(${r},${g},${b},${level.toFixed(3)})`;
      ctx.fill(path);
    }

    // Beam direction projected on the panel: +y on screen is north.
    const cx = CW / 2;
    const cy = CH / 2;
    const ax = ex;
    const ay = -ny;
    const len = 58 + 74 * k;
    ctx.strokeStyle = "rgba(233,239,252,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - ax * 8, cy - ay * 8);
    ctx.lineTo(cx + ax * len, cy + ay * len);
    ctx.stroke();
    const hx = cx + ax * len;
    const hy = cy + ay * len;
    ctx.fillStyle = "rgba(233,239,252,0.8)";
    ctx.beginPath();
    ctx.moveTo(hx + ax * 9, hy + ay * 9);
    ctx.lineTo(hx - ay * 5.5, hy + ax * 5.5);
    ctx.lineTo(hx + ay * 5.5, hy - ax * 5.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(148,176,224,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.stroke();

    // Corner ticks, to read as an instrument panel.
    ctx.strokeStyle = "rgba(148,176,224,0.28)";
    ctx.lineWidth = 1;
    const tick = 12;
    for (const [x, y, sx, sy] of [
      [padX - 16, padY - 16, 1, 1],
      [CW - padX + 16, padY - 16, -1, 1],
      [padX - 16, CH - padY + 16, 1, -1],
      [CW - padX + 16, CH - padY + 16, -1, -1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x, y + sy * tick);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * tick, y);
      ctx.stroke();
    }
  }, [el, az, time]);

  return (
    <canvas
      ref={ref}
      className="block h-auto w-full rounded-[14px]"
      style={{ aspectRatio: `${CW} / ${CH}` }}
      role="img"
      aria-label={`The 1,280 element phased array. A phase ramp runs across the panel, steering the beam to ${zenithAngle(el).toFixed(0)} degrees from straight up, towards azimuth ${az.toFixed(0)} degrees.`}
    />
  );
}

/* -------------------------------------------------------------------------- */

const PW = 360;
const PH = 200;
const PL = 34;
const PR = 12;
const PT = 16;
const PB = 30;

export function BeamPattern({
  steerDeg,
  nextSteerDeg,
}: {
  steerDeg: number;
  nextSteerDeg: number | null;
}) {
  const x = (alpha: number) => PL + (alpha / 90) * (PW - PL - PR);
  const y = (db: number) => PT + (-Math.max(-32, Math.min(0, db)) / 32) * (PH - PT - PB);

  const curve = (steer: number) =>
    Array.from({ length: 181 }, (_, i) => {
      const alpha = (i / 180) * 90;
      return `${x(alpha).toFixed(1)},${y(arrayFactorDb(alpha, steer)).toFixed(1)}`;
    }).join(" ");

  return (
    <svg
      viewBox={`0 0 ${PW} ${PH}`}
      className="block h-auto w-full"
      role="img"
      aria-label={`Beam pattern: the main lobe points ${steerDeg.toFixed(0)} degrees away from straight up.`}
    >
      <rect width={PW} height={PH} fill="#050a13" rx="8" />
      {[0, -10, -20, -30].map((db) => (
        <g key={db}>
          <line x1={PL} x2={PW - PR} y1={y(db)} y2={y(db)} stroke="rgba(148,176,224,0.1)" />
          <text x={PL - 6} y={y(db) + 3} textAnchor="end" fill="#5f7595" style={{ fontFamily: FONT, fontSize: 7.4 }}>
            {db}
          </text>
        </g>
      ))}
      {[0, 30, 60, 90].map((a) => (
        <g key={a}>
          <line x1={x(a)} x2={x(a)} y1={PT} y2={PH - PB} stroke="rgba(148,176,224,0.07)" />
          <text x={x(a)} y={PH - PB + 12} textAnchor="middle" fill="#5f7595" style={{ fontFamily: FONT, fontSize: 7.4 }}>
            {a}°
          </text>
        </g>
      ))}

      {nextSteerDeg !== null && (
        <polyline
          points={curve(nextSteerDeg)}
          fill="none"
          stroke="#fbbf24"
          strokeOpacity="0.5"
          strokeWidth="1.2"
          strokeDasharray="3 4"
        />
      )}
      <polyline points={curve(steerDeg)} fill="none" stroke="#3ddbd9" strokeWidth="1.8" />
      <line
        x1={x(steerDeg)}
        x2={x(steerDeg)}
        y1={PT}
        y2={PH - PB}
        stroke="#3ddbd9"
        strokeOpacity="0.35"
        strokeDasharray="2 4"
      />
      <circle cx={x(steerDeg)} cy={y(0)} r="3.2" fill="#7ee7e2" />

      <text x={PL} y={PH - 5} fill="#5f7595" style={{ fontFamily: FONT, fontSize: 7.2, letterSpacing: 0.8 }}>
        ANGLE FROM ZENITH → HORIZON
      </text>
      <text x={PW - PR} y={11} textAnchor="end" fill="#5f7595" style={{ fontFamily: FONT, fontSize: 7.2 }}>
        dB
      </text>
      <g style={{ fontFamily: FONT, fontSize: 7.2 }}>
        <line x1={PL + 4} x2={PL + 16} y1={PT + 8} y2={PT + 8} stroke="#3ddbd9" strokeWidth="1.8" />
        <text x={PL + 20} y={PT + 11} fill="#7ee7e2">
          SERVING
        </text>
        {nextSteerDeg !== null && (
          <>
            <line
              x1={PL + 4}
              x2={PL + 16}
              y1={PT + 20}
              y2={PT + 20}
              stroke="#fbbf24"
              strokeOpacity="0.6"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
            <text x={PL + 20} y={PT + 23} fill="#fbbf24" fillOpacity="0.8">
              AFTER HANDOVER
            </text>
          </>
        )}
      </g>
    </svg>
  );
}
