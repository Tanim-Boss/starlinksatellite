import { useState } from "react";
import { ArrowLeftRight, Camera, Info } from "lucide-react";
import { CABLES, MEDIA_CREDITS, cableById, mediaAsset, type CableSpec } from "@/lib/network/media";
import { cn } from "@/utils/cn";

/*
 * Real photographs of the three cables, plus the connector that ends each one.
 *
 * The pictures are the lesson: a student who has only ever seen a diagram of a
 * "cable" should recognise the actual object in the school lab. Every card
 * pairs the cable photo with a close-up of its connector and a cutaway strip
 * that names the layers from outside in, so the photo and the theory refer to
 * the same three inches of hardware.
 */

function PhotoCard({ cable }: { cable: CableSpec }) {
  const [face, setFace] = useState<"cable" | "connector">("cable");
  const isCable = face === "cable";

  return (
    <article className="net-photo-card">
      <div className="relative">
        {/* Both photographs stay in the document so the cable and its
            connector are always described to assistive tech; the toggle only
            changes which one is visible. */}
        {(
          [
            { id: "cable", src: cable.photo, alt: cable.photoAlt },
            { id: "connector", src: cable.connectorPhoto, alt: cable.connectorPhotoAlt },
          ] as const
        ).map((photo) => (
          <img
            key={photo.id}
            src={mediaAsset(photo.src)}
            alt={photo.alt}
            width={960}
            height={720}
            loading="lazy"
            decoding="async"
            className={cn("net-photo net-photo--stack", face === photo.id && "net-photo--on")}
          />
        ))}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-[#04060d] to-transparent" />
        <span className="net-photo-tag">
          <Camera size={11} />
          {isCable ? "আসল কেবল" : "আসল কানেক্টর"}
        </span>
        <div className="absolute right-2 bottom-2 flex gap-1.5" role="group" aria-label={`${cable.label} — ছবি বদলাও`}>
          {(
            [
              { id: "cable", label: "কেবল" },
              { id: "connector", label: "কানেক্টর" },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={face === option.id}
              onClick={() => setFace(option.id)}
              className={cn("net-photo-switch", face === option.id && "net-photo-switch--on")}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 p-4 md:p-5">
        <header>
          <h3 className="bangla text-[15px] font-semibold leading-snug text-white">{cable.label}</h3>
          <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-signal">{cable.en}</p>
        </header>
        <p className="bangla text-[12.5px] leading-relaxed text-muted">{cable.summary}</p>

        <div className="rounded-xl border border-laser/30 bg-laser/[0.07] px-3 py-2.5">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-laser">কানেক্টর</p>
          <p className="bangla mt-1 text-[12.5px] font-medium text-white">
            {cable.connector.name}
            <span className="ml-2 font-mono text-[9.5px] font-normal tracking-[0.1em] text-laser/80">
              {cable.connector.en}
            </span>
          </p>
          <p className="bangla mt-1 text-[11.5px] leading-relaxed text-muted">{cable.connector.note}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {cable.facts.map((fact) => (
            <span
              key={fact.label}
              className="bangla rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10.5px] text-muted"
            >
              <span className="text-faint">{fact.label}: </span>
              {fact.value}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

/** The cutaway: layers outside → inside, with a live hover/focus highlight. */
function Cutaway({ cable }: { cable: CableSpec }) {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.015] p-4">
      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
        ভেতরে কী আছে — বাইরের স্তর থেকে ভেতরের দিকে
      </p>
      <svg viewBox="0 0 420 140" className="net-svg mt-3 w-full" role="img" aria-label={`${cable.en}-এর ভেতরের স্তর`}>
        {cable.layers.map((layer, index) => {
          const isOn = active === index;
          const inset = index * 16;
          const height = 120 - index * 30;
          return (
            <g
              key={layer.name}
              tabIndex={0}
              role="button"
              aria-label={`${layer.name}: ${layer.detail}`}
              aria-pressed={isOn}
              className="net-cutaway-layer"
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(active === index ? null : index)}
            >
              <rect
                x={16 + inset}
                y={15 + inset / 2}
                width={184 - inset * 2}
                height={height}
                rx={height / 2}
                fill={layer.color}
                fillOpacity={isOn ? 0.55 : 0.16 + index * 0.06}
                stroke={layer.color}
                strokeOpacity={isOn ? 0.95 : 0.5}
                strokeWidth={isOn ? 2 : 1.1}
              />
            </g>
          );
        })}
        <g>
          {cable.layers.map((layer, index) => (
            <g key={`legend-${layer.name}`}>
              <circle cx={222} cy={26 + index * 26} r={4} fill={layer.color} />
              <text
                x={232}
                y={29 + index * 26}
                className="net-node-note"
                fill={active === index ? "#e9effc" : "#8b9bb9"}
              >
                {layer.name}
              </text>
            </g>
          ))}
        </g>
      </svg>
      <p className="bangla mt-2 min-h-[2.5em] text-[12px] leading-relaxed text-ink" aria-live="polite">
        {active === null ? (
          <span className="text-faint">স্তরে ট্যাপ করো — কোন স্তর কী কাজ করে দেখো।</span>
        ) : (
          cable.layers[active].detail
        )}
      </p>
    </div>
  );
}

function CompareTable() {
  const rows: { label: string; get: (cable: CableSpec) => string }[] = [
    { label: "সংকেত", get: (cable) => cable.signal },
    { label: "কানেক্টর", get: (cable) => cable.connector.name },
    { label: "কোথায় ব্যবহার", get: (cable) => cable.typicalUse },
  ];

  return (
    <div className="net-figure">
      <table className="w-full border-collapse text-left">
        <caption className="bangla border-b border-white/[0.07] px-4 py-3 text-left text-[12px] text-faint">
          তিন কেবল এক নজরে — ডাটা সব ক্ষেত্রেই এক, বদলায় শুধু বহনকারী মাধ্যম
        </caption>
        <thead>
          <tr>
            <th className="bangla px-4 py-2.5 text-[11px] font-normal text-faint"> </th>
            {CABLES.map((cable) => (
              <th key={cable.id} className="bangla px-4 py-2.5 text-[12px] font-semibold text-white">
                {cable.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-white/[0.06]">
              <th scope="row" className="bangla px-4 py-2.5 text-[11.5px] font-normal text-faint">
                {row.label}
              </th>
              {CABLES.map((cable) => (
                <td key={cable.id} className="bangla px-4 py-2.5 text-[12px] align-top text-ink">
                  {row.get(cable)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CableGallery({ className }: { className?: string }) {
  const [selected, setSelected] = useState<CableSpec["id"]>("coax");
  const cable = cableById(selected) ?? CABLES[0];

  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex flex-wrap gap-2" role="group" aria-label="কোন কেবলটি দেখতে চাও">
        {CABLES.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={selected === item.id}
            onClick={() => setSelected(item.id)}
            className={cn(
              "bangla rounded-full border px-3.5 py-2 text-[12.5px] transition-colors",
              selected === item.id
                ? "border-signal bg-signal/15 text-signal"
                : "border-white/12 bg-white/[0.02] text-muted hover:border-white/30 hover:text-white",
            )}
          >
            {item.tab}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {CABLES.map((item) => (
          <div
            key={item.id}
            className={cn(
              "transition-opacity",
              item.id === selected ? "opacity-100" : "opacity-70 hover:opacity-100",
            )}
          >
            <PhotoCard cable={item} />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Cutaway cable={cable} />
        <div className="space-y-3">
          <div className="rounded-2xl border border-signal/25 bg-signal/[0.05] p-4">
            <p className="bangla flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-signal">
              <ArrowLeftRight size={12} /> একই ডাটা, আলাদা সংকেত
            </p>
            <p className="bangla mt-2 text-[12.5px] leading-relaxed text-ink">
              <strong className="text-white">{cable.label}</strong> এর ভেতরে ডাটা চলে{" "}
              <strong className="text-signal">{cable.signal}</strong> হিসেবে। যেকোনো একটির পরিবর্তে
              অন্যটি বসালে ডাটা একই থাকে — শুধু সংকেত বদলায়।
            </p>
          </div>
          <div className="rounded-2xl border border-laser/25 bg-laser/[0.05] p-4">
            <p className="bangla font-mono text-[9px] uppercase tracking-[0.16em] text-laser">
              বাস্তবে কোথায় দেখবে
            </p>
            <p className="bangla mt-2 text-[12.5px] leading-relaxed text-ink">{cable.whereUsed}</p>
          </div>
          <p className="bangla flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11px] leading-relaxed text-faint">
            <Info size={13} className="mt-0.5 shrink-0 text-faint" />
            ছবিগুলো বাস্তব কেবলের ফটো (Wikimedia Commons), রঙ ও আকার দেখে চেনা যায়। নিচে ছবির
            ক্রেডিট দেওয়া আছে।
          </p>
        </div>
      </div>

      <CompareTable />
    </div>
  );
}

/** Attribution strip for every photo the lesson shows. */
export function MediaCredits({ className }: { className?: string }) {
  return (
    <details className={cn("rounded-2xl border border-white/10 bg-white/[0.02] p-4", className)}>
      <summary className="bangla cursor-pointer font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">
        ছবির সূত্র ও লাইসেন্স ({MEDIA_CREDITS.length})
      </summary>
      <ul className="mt-3 space-y-2">
        {MEDIA_CREDITS.map((credit) => (
          <li key={credit.file} className="bangla text-[11.5px] leading-relaxed text-muted">
            <a
              href={credit.source}
              target="_blank"
              rel="noreferrer noopener"
              className="text-ink underline decoration-white/25 underline-offset-2 hover:text-signal"
            >
              {credit.title}
            </a>
            {" — "}
            {credit.author}
            {" · "}
            <a
              href={credit.licenseUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-faint underline decoration-white/20 underline-offset-2 hover:text-signal"
            >
              {credit.license}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
