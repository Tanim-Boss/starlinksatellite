import type { ReactNode } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Clock3, Globe2, Network, Radio, Satellite, SatelliteDish, Wifi, X } from "lucide-react";
import { LabStage } from "@/components/OrbitLab/LabStage";

function SectionEyebrow({ children }: { children: ReactNode }) {
  return <p className="lab-eyebrow"><span />{children}</p>;
}

function HeroOrbit() {
  return (
    <div className="lab-hero-orbit" aria-hidden="true">
      <svg viewBox="0 0 185 112" fill="none">
        <circle cx="92" cy="56" r="21" stroke="#9acfe2" strokeOpacity=".45" />
        <circle cx="92" cy="56" r="14" fill="#91cfe4" fillOpacity=".08" />
        <ellipse cx="92" cy="56" rx="78" ry="31" transform="rotate(-21 92 56)" stroke="#9acfe2" strokeOpacity=".22" />
        <ellipse cx="92" cy="56" rx="57" ry="23" transform="rotate(29 92 56)" stroke="#9acfe2" strokeOpacity=".14" />
        <circle cx="156" cy="27" r="3" fill="#f4ad76" />
        <circle cx="42" cy="36" r="2.5" fill="#90dded" />
        <path d="M91 25V18M91 94V87M61 56H54M130 56H123" stroke="#9acfe2" strokeOpacity=".3" />
      </svg>
      <div><strong>ONE PLANET.</strong><span>TWO WAYS TO CONNECT.</span></div>
    </div>
  );
}

function MetricCards() {
  return (
    <div className="lab-metric-grid">
      <article className="lab-metric-card">
        <div className="lab-metric-head"><span><Globe2 size={16} /> ORBIT ALTITUDE</span><small>01 / 03</small></div>
        <div className="lab-metric-values">
          <div><span><i className="lab-dot lab-dot--warm" /> BROADCAST</span><strong>35,786 <small>km</small></strong></div>
          <div><span><i className="lab-dot lab-dot--cool" /> STARLINK</span><strong>~550 <small>km</small></strong></div>
        </div>
        <p>Low orbit is roughly 65 times closer to Earth.</p>
      </article>
      <article className="lab-metric-card">
        <div className="lab-metric-head"><span><Radio size={16} /> SIGNAL DIRECTION</span><small>02 / 03</small></div>
        <div className="lab-metric-values">
          <div><span><i className="lab-dot lab-dot--warm" /> BROADCAST</span><strong>One-way</strong></div>
          <div><span><i className="lab-dot lab-dot--cool" /> STARLINK</span><strong>Two-way</strong></div>
        </div>
        <p>TV is received; internet requests travel both ways.</p>
      </article>
      <article className="lab-metric-card">
        <div className="lab-metric-head"><span><Clock3 size={16} /> TYPICAL LATENCY</span><small>03 / 03</small></div>
        <div className="lab-metric-values">
          <div><span><i className="lab-dot lab-dot--warm" /> GEO INTERNET</span><strong>~600 <small>ms</small></strong></div>
          <div><span><i className="lab-dot lab-dot--cool" /> STARLINK</span><strong>~20–40 <small>ms</small></strong></div>
        </div>
        <p>Round-trip estimates. Actual latency varies by route.</p>
      </article>
    </div>
  );
}

function ComparisonCards() {
  return (
    <div className="lab-comparison-grid">
      <article className="lab-system-card lab-system-card--warm">
        <div className="lab-system-card-top"><span className="lab-system-number">01 / THE BROADCASTER</span><span className="lab-system-tag">GEO ORBIT</span></div>
        <div className="lab-system-content"><div><h3>Broadcast satellite</h3><p>Built to deliver the same television signal to many receivers across a wide region.</p></div><div className="lab-system-art lab-system-art--warm"><SatelliteDish size={52} strokeWidth={1.05} /></div></div>
        <div className="lab-system-rule" />
        <div className="lab-fact-row"><span>Position in the sky</span><strong>Appears fixed</strong></div>
        <div className="lab-fact-row"><span>Terminal</span><strong>Parabolic TV dish</strong></div>
        <div className="lab-fact-row"><span>Receive / send</span><strong><Check size={14} /> Receive <X size={14} /> Send</strong></div>
        <div className="lab-system-bottom"><span><i className="lab-dot lab-dot--warm" /> ONE SATELLITE, WIDE COVERAGE</span><ArrowUpRight size={15} /></div>
      </article>
      <article className="lab-system-card lab-system-card--cool">
        <div className="lab-system-card-top"><span className="lab-system-number">02 / THE NETWORK</span><span className="lab-system-tag">LOW EARTH ORBIT</span></div>
        <div className="lab-system-content"><div><h3>Starlink satellites</h3><p>Built to provide two-way internet through a large, constantly moving constellation.</p></div><div className="lab-system-art lab-system-art--cool"><Satellite size={52} strokeWidth={1.05} /></div></div>
        <div className="lab-system-rule" />
        <div className="lab-fact-row"><span>Position in the sky</span><strong>Moving overhead</strong></div>
        <div className="lab-fact-row"><span>Terminal</span><strong>Phased-array antenna</strong></div>
        <div className="lab-fact-row"><span>Receive / send</span><strong><Check size={14} /> Receive <Check size={14} /> Send</strong></div>
        <div className="lab-system-bottom"><span><i className="lab-dot lab-dot--cool" /> MANY SATELLITES, MOVING COVERAGE</span><ArrowUpRight size={15} /></div>
      </article>
    </div>
  );
}

export function OrbitLab() {
  return (
    <>
      <section className="lab-hero lab-container" aria-labelledby="lab-title">
        <div className="lab-hero-copy">
          <SectionEyebrow>AN INTERACTIVE FIELD GUIDE <span className="lab-eyebrow-separator">/</span> BEYOND THE HORIZON</SectionEyebrow>
          <h1 id="lab-title">Same sky. <span>Different satellites.</span></h1>
          <p>Explore how a traditional broadcast satellite and the Starlink constellation connect our world—in an interactive 3D simulation.</p>
          <a href="#/@simulation" className="lab-hero-link">TAKE A CLOSER LOOK <ArrowDown size={14} /></a>
        </div>
        <HeroOrbit />
      </section>

      <section className="lab-simulation lab-container" id="simulation" aria-labelledby="simulation-title">
        <div className="lab-section-heading lab-section-heading--sim">
          <div><SectionEyebrow>01 <span className="lab-eyebrow-separator">/</span> THE SIMULATION</SectionEyebrow><h2 id="simulation-title">See the difference for yourself<span className="lab-heading-period">.</span></h2></div>
          <p className="lab-section-aside"><span className="lab-live-dot" /> INTERACTIVE 3D MODEL <span className="lab-aside-line" /> EXPLORE AT YOUR OWN PACE</p>
        </div>
        <LabStage />
        <div className="lab-stage-caption"><span><span>✳</span> A SIMPLIFIED VIEW OF TWO VERY DIFFERENT SYSTEMS</span><span>SCROLL TO DISCOVER MORE <ArrowDown size={13} /></span></div>
      </section>

      <section className="lab-comparison-section lab-container" id="comparison" aria-labelledby="comparison-title">
        <div className="lab-section-heading">
          <div><SectionEyebrow>02 <span className="lab-eyebrow-separator">/</span> THE COMPARISON</SectionEyebrow><h2 id="comparison-title">A little distance changes everything<span className="lab-heading-period">.</span></h2></div>
          <p>Two ways to use space, each designed for a very different job. Here are the differences at a glance.</p>
        </div>
        <MetricCards />
        <div className="lab-comparison-intro"><div><SectionEyebrow>THE SYSTEMS, SIDE BY SIDE</SectionEyebrow><h3>Same sky, different purpose.</h3></div><span>THE DETAILS <ArrowRight size={15} /></span></div>
        <ComparisonCards />
      </section>

      <section className="lab-journey-section" id="how-it-works" aria-labelledby="journey-title">
        <div className="lab-container">
          <div className="lab-section-heading">
            <div><SectionEyebrow>03 <span className="lab-eyebrow-separator">/</span> FOLLOW THE SIGNAL</SectionEyebrow><h2 id="journey-title">How a connection gets around<span className="lab-heading-period">.</span></h2></div>
            <p>Unlike a TV broadcast, a Starlink connection is a conversation. Here's the simplified journey.</p>
          </div>
          <div className="lab-journey-grid">
            <article><div className="lab-journey-top"><span>01</span><Wifi size={20} /></div><h3>From your terminal</h3><p>Your antenna sends a request to a Starlink satellite passing overhead.</p></article>
            <article><div className="lab-journey-top"><span>02</span><Network size={20} /></div><h3>Across the network</h3><p>The signal is relayed toward a ground station, sometimes using links between satellites.</p></article>
            <article><div className="lab-journey-top"><span>03</span><ArrowDown size={20} /></div><h3>Back to Earth</h3><p>The response travels back to your terminal, with handoffs as satellites move.</p></article>
          </div>
          <div className="lab-accuracy-note"><span>ABOUT THE MODEL</span><p>Orbits, spacecraft and signals are simplified for learning. GEO and LEO distances are not drawn to scale; figures are approximate and are not live telemetry. GEO latency above refers to satellite internet, not a one-way TV broadcast.</p><a href="#/@simulation">BACK TO SIMULATION <ArrowUpRight size={14} /></a></div>
        </div>
      </section>
    </>
  );
}
