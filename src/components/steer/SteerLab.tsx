import { useEffect } from "react";
import { fsStageClass, useFullscreen } from "@/components/site/FullscreenStage";
import { useMediaQuery, useReducedMotion } from "@/lib/useMediaQuery";
import { SteerControls } from "./SteerControls";
import { SteerDriver } from "./SteerDriver";
import { SteerHud } from "./SteerHud";
import { SteerScene } from "./SteerScene";
import { StageStrip } from "./StageStrip";
import { useSteerLab } from "./steerStore";

/**
 * The satellite beam-steering simulation: cinematic 3D scene on top, the
 * five-stage narrative rail and every working control beneath it. One RAF
 * driver, one mutable clock, memoised canvas — readouts refresh at ~8 Hz, the
 * WebGL loop runs at the display rate.
 */
export function SteerLab() {
  const compact = useMediaQuery("(max-width: 767px)");
  const reduced = useReducedMotion();
  const fs = useFullscreen<HTMLDivElement>();

  useEffect(() => {
    if (reduced) useSteerLab.setState({ playing: false });
  }, [reduced]);

  return (
    <section id="simulation" className="relative scroll-mt-24 py-8 md:py-10">
      <div className="page-shell">
        <div className="panel overflow-hidden">
          <SteerDriver />

          <div className="border-b border-white/[0.07] bg-[#060b16] px-4 py-3.5 md:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-faint">
                    Inter-satellite beam steering simulator
                  </p>
                  <span className="rounded-full border border-warn/30 bg-warn/[0.06] px-2 py-0.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-warn">
                    educational model
                  </span>
                </div>
                <h2 className="mt-1 text-[clamp(1.15rem,2.4vw,1.5rem)] font-semibold tracking-[-0.02em] text-white">
                  The satellite stays still. The terminal does the work.
                </h2>
              </div>
              <p className="max-w-sm text-[10.5px] leading-relaxed text-muted">
                Select Satellite B and watch the gimbaled terminal slew its narrow beam across
                space — wavefronts, laser and packets all follow the live pointing direction.
              </p>
            </div>
          </div>

          <StageStrip />

          <div
            id="steer-lab-scene"
            ref={fs.ref}
            className={fsStageClass(
              fs.isFullscreen,
              fs.hasNative,
              "relative h-[440px] overflow-hidden bg-[#02050c] sm:h-[540px] lg:h-[620px]",
            )}
          >
            <SteerScene compact={compact} className="absolute inset-0 fs-fill" />
            <SteerHud fullscreen={fs.isFullscreen} onFullscreen={fs.toggle} />
          </div>

          <SteerControls />

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] bg-[#040a13] px-4 py-2.5 md:px-5">
            <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
              Two-axis gimbal · azimuth + elevation · body frame illustrative
            </p>
            <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
              Not orbital propagation · not an electromagnetic solver
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
