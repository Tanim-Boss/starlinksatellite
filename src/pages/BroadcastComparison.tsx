const assetBase = (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) || "/";
const VIDEO_SRC = `${assetBase}videos/broadcast-vs-starlink.mp4`;

export function BroadcastComparison() {
  return (
    <section id="comparison" className="relative overflow-hidden pb-16 pt-28 md:pb-24 md:pt-36">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" aria-hidden />
      <div
        className="pointer-events-none absolute -right-24 top-8 h-80 w-80 rounded-full bg-[#ff7a1a]/[0.07] blur-3xl"
        aria-hidden
      />

      <div className="page-shell relative">
        <h1 className="max-w-4xl text-[clamp(2rem,4.8vw,3.4rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-white">
          Broadcast TV Satellite{" "}
          <span className="text-gradient">vs Starlink</span>
        </h1>

        <div className="mt-8 overflow-hidden rounded-[18px] border border-white/10 bg-[#02040a] shadow-[0_28px_100px_rgba(0,0,0,0.45)]">
          <video
            className="block aspect-video w-full bg-black object-contain"
            src={VIDEO_SRC}
            controls
            playsInline
            preload="metadata"
            aria-label="Broadcast TV Satellite vs Starlink"
          >
            Your browser does not support HTML5 video. Download the{" "}
            <a href={VIDEO_SRC} download>
              Broadcast TV Satellite vs Starlink video (MP4)
            </a>
            .
          </video>
        </div>
      </div>
    </section>
  );
}
