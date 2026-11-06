import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, LockKeyhole, Pause, Play, RotateCcw, RefreshCw, Globe2 } from "lucide-react";

/** Edit this object to retarget the demo or change its pacing/copy. */
const JOURNEY_CONFIG = {
  domain: "facebook.com",
  ip: "157.240.22.35",
  durations: [4700, 2600, 3200, 3000, 3000, 3000, 2300, 6200],
  captions: [
    "You type a web address. When you press Enter, the browser starts by asking where that name lives.",
    "The browser sends a DNS question: “facebook.com?”",
    "DNS checks its address book and finds the matching network address.",
    "DNS replies with 157.240.22.35. The browser now knows where to connect.",
    "The browser opens a connection to that IP address and requests the home page: GET /.",
    "The web server receives the request and prepares the page.",
    "The server returns “200 OK” and sends the page data back to the browser.",
    "The browser builds the page as its files arrive, then displays a simulated Facebook login page.",
  ],
  captionsBn: [
    "তুমি একটি ওয়েব ঠিকানা লেখো। Enter চাপলে ব্রাউজার প্রথমে জানতে চায় নামটির ঠিকানা কোথায়।",
    "ব্রাউজার DNS-কে জিজ্ঞেস করে: “facebook.com?”",
    "DNS তার ঠিকানা-তালিকা দেখে মিল থাকা নেটওয়ার্ক ঠিকানাটি খুঁজে পায়।",
    "DNS 157.240.22.35 ঠিকানাটি ফেরত দেয়। এখন ব্রাউজার জানে কোথায় সংযোগ করতে হবে।",
    "ব্রাউজার ওই IP-তে সংযোগ খুলে হোম পেজ চায়: GET /।",
    "ওয়েব সার্ভার অনুরোধ পেয়ে পেজটি তৈরি করে।",
    "সার্ভার “200 OK” পাঠায় এবং পেজের ডেটা ব্রাউজারে ফেরত দেয়।",
    "ফাইল আসার সঙ্গে সঙ্গে ব্রাউজার পেজটি সাজায়, শেষে একটি সিমুলেটেড Facebook লগইন পেজ দেখায়।",
  ],
} as const;

const STEPS = ["Type address", "DNS request", "DNS lookup", "DNS reply", "Page request", "Server work", "Response", "Page render"];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function Rack({ kind, active, loaded = false }: { kind: "dns" | "web"; active: boolean; loaded?: boolean }) {
  return <div className={`bj-rack ${active ? "is-active" : ""} ${loaded ? "is-loaded" : ""}`} aria-hidden="true">
    <div className="bj-rack-top"><span>{kind === "dns" ? "DNS · 01" : "WEB · 04"}</span><span className="bj-rack-status">{active ? "ACTIVE" : "READY"}</span></div>
    {[0, 1, 2].map((row) => <div className="bj-rack-unit" key={row}>
      <span className="bj-rack-slot" /><span className="bj-rack-slot short" />
      <i className={`bj-led ${active ? "lit" : ""}`} /><i className={`bj-led teal ${active ? "lit" : ""}`} />
      <span className="bj-rack-vent">••••••</span>
    </div>)}
    <div className="bj-rack-foot"><span>{kind === "dns" ? "NAME RESOLUTION" : "APPLICATION SERVER"}</span><span>● ● ●</span></div>
  </div>;
}

function BrowserWindow({ step, typed, onEnter, typing }: { step: number; typed: string; onEnter: () => void; typing: boolean }) {
  // DNS resolves the domain behind the scenes; the address bar keeps the domain.
  const address = typed;
  return <div className={`bj-laptop ${step >= 7 ? "page-ready" : ""}`}>
    <div className="bj-screen-frame"><div className="bj-browser">
      <div className="bj-tabbar"><span className="bj-tab"><span className="bj-tab-dot" /> New tab <span className="bj-tab-close">×</span></span><span className="bj-add-tab">+</span><span className="bj-window-actions">−　□　×</span></div>
      <div className="bj-toolbar"><button aria-label="Go back" tabIndex={-1}>‹</button><button aria-label="Go forward" tabIndex={-1}>›</button><button aria-label="Refresh" tabIndex={-1}><RefreshCw size={12} /></button>
        <div className={`bj-address ${step === 0 ? "is-typing" : ""}`} onClick={onEnter}><LockKeyhole size={12} /><span className="bj-address-text">{address || <span className="bj-placeholder">Search or enter address</span>}{step === 0 && <i className="bj-caret" />}</span><span className="bj-address-more">☆　⋮</span></div>
      </div>
      <div className="bj-page">
        {step < 7 ? <div className="bj-newtab"><div className="bj-google-mark"><Globe2 size={20} /> <span>the web, connected</span></div><div className="bj-searchbox"><span>⌕</span> Search the web or type a URL</div><div className="bj-shortcuts"><span>◎</span><span>◇</span><span>＋</span></div></div> : <div className="bj-login" aria-label="Simulated Facebook login page, for illustration only">
          <div className="bj-login-brand"><strong>facebook</strong><span>Connect with friends and the world around you.</span></div>
          <div className="bj-login-card" aria-hidden="true"><div className="bj-login-field">Email or phone number</div><div className="bj-login-field">Password</div><div className="bj-login-button">Log in</div><span>Forgot password?</span><div className="bj-login-divider" /><div className="bj-login-create">Create new account</div></div>
          <div className="bj-login-note">SIMULATION · NO REAL LOGIN</div>
        </div>}
      </div>
    </div></div><div className="bj-laptop-base"><span /></div><div className="bj-laptop-foot" />
    <LaptopUser typing={typing} />
    <div className="bj-station-label"><span className="bj-label-dot" /> YOUR LAPTOP <small>Browser · Client</small></div>
  </div>;
}

/** A seated user in profile, with the hands reaching towards the keyboard. */
function LaptopUser({ typing }: { typing: boolean }) {
  return <svg className={`bj-user ${typing ? "is-typing" : ""}`} viewBox="0 0 180 220" aria-hidden="true">
    {/* Chair, seated legs and shoes */}
    <path d="M19 118 Q12 115 12 126 L12 184 Q12 190 21 190 L64 190" fill="none" stroke="#718488" strokeWidth="7" strokeLinecap="round" />
    <path d="M29 179 L24 213 M61 184 L66 213" stroke="#718488" strokeWidth="4" strokeLinecap="round" />
    <path d="M37 157 Q52 153 70 164 L100 176 Q108 179 105 187 Q103 193 94 191 L61 183 L38 184 Z" fill="#344658" />
    <path d="M53 181 L80 187 L85 211 L72 211 L64 194 L39 193 Z" fill="#27394a" />
    <path d="M70 209 L85 209 Q94 210 96 216 L70 216 Z M93 186 L107 183 Q115 184 117 190 L94 194 Z" fill="#1c2c38" />
    {/* Torso, neck and profile */}
    <path d="M42 85 Q27 87 24 104 L27 157 Q35 170 61 163 L69 125 L65 101 Q61 89 53 86 Z" fill="#497f85" />
    <path d="M43 79 L43 94 Q50 100 56 91 L54 75 Z" fill="#bb8065" />
    <path d="M33 47 Q36 31 51 32 Q67 33 69 47 L68 56 L73 64 L67 67 Q67 79 59 83 Q47 87 37 76 Q30 66 33 47 Z" fill="#d6a083" />
    <path d="M33 59 Q25 53 31 40 Q37 27 52 29 Q68 29 69 43 Q62 37 54 42 Q43 39 42 51 L40 61 Z" fill="#27323a" />
    <path d="M37 58 Q31 55 32 63 Q33 70 39 68" fill="#c38c72" /><circle cx="62" cy="56" r="1.5" fill="#26343c" />
    <path d="M64 73 Q60 75 57 73" fill="none" stroke="#955e4e" strokeWidth="1.2" strokeLinecap="round" />
    {/* Forearms move only while the address is being typed. */}
    <g className="bj-user-arm bj-user-arm-back"><path d="M51 104 Q59 102 64 111 L79 139 L111 143" fill="none" stroke="#396b73" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" /><path d="M110 143 L125 140 M111 145 L125 145" stroke="#d6a083" strokeWidth="5" strokeLinecap="round" /></g>
    <g className="bj-user-arm bj-user-arm-front"><path d="M39 108 Q48 105 53 114 L66 145 L105 151" fill="none" stroke="#5b9398" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" /><path d="M103 151 L118 148 M104 153 L119 153" stroke="#d6a083" strokeWidth="5" strokeLinecap="round" /></g>
  </svg>;
}

function Packet({ tone, label, route, progress }: { tone: "request" | "response"; label: string; route: "dns" | "web"; progress: number }) {
  const mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 700px)").matches;
  const start = mobile ? { x: 50, y: route === "dns" ? 23 : 25 } : { x: 27, y: 74 };
  const end = mobile ? { x: 50, y: route === "dns" ? 45 : 80 } : route === "dns" ? { x: 57, y: 36 } : { x: 75, y: 74 };
  const from = tone === "response" ? end : start;
  const to = tone === "response" ? start : end;
  const x = from.x + (to.x - from.x) * progress;
  const y = from.y + (to.y - from.y) * progress;
  return <div className={`bj-packet ${tone}`} style={{ left: `${x}%`, top: `${y}%` }} aria-hidden="true"><span className="bj-packet-dot" /><span className="bj-packet-chip">{label}</span></div>;
}

/** Self-contained, embeddable browser-to-server journey section. */
export function BrowserJourney() {
  const rootRef = useRef<HTMLElement>(null);
  const frameRef = useRef<number | null>(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [bengali, setBengali] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [enterPressed, setEnterPressed] = useState(false);
  const elapsed = useRef(0);
  const lastFrame = useRef(0);
  const duration = JOURNEY_CONFIG.durations[step] / speed;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update(); media.addEventListener("change", update);
    const width = window.matchMedia("(max-width: 700px)");
    const updateWidth = () => setMobile(width.matches);
    updateWidth(); width.addEventListener("change", updateWidth);
    return () => { media.removeEventListener("change", update); width.removeEventListener("change", updateWidth); };
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || !("IntersectionObserver" in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (visible && !reduced && step < 7) setPlaying(true);
    else setPlaying(false);
  }, [visible, reduced]);

  useEffect(() => { elapsed.current = 0; setProgress(0); setEnterPressed(false); }, [step]);
  useEffect(() => { if (playing && visible && !reduced && step < 7) elapsed.current = 0; }, [playing, visible, reduced, step]);

  useEffect(() => {
    if (!playing || !visible || reduced || step >= 7) return;
    const tick = (now: number) => {
      if (!lastFrame.current) lastFrame.current = now;
      elapsed.current += now - lastFrame.current;
      lastFrame.current = now;
      const ratio = clamp(elapsed.current / duration, 0, 1);
      setProgress(ratio);
      if (step === 0 && ratio >= 0.76) setEnterPressed(true);
      if (ratio >= 1) {
        setStep((current) => Math.min(7, current + 1));
        if (step >= 6) setPlaying(false);
      } else frameRef.current = requestAnimationFrame(tick);
    };
    lastFrame.current = 0;
    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); };
  }, [playing, visible, reduced, step, duration]);

  const goTo = useCallback((next: number) => { setStep(clamp(next, 0, 7)); setPlaying(false); }, []);
  const togglePlay = useCallback(() => {
    if (reduced) { setStep((current) => current >= 7 ? 0 : current + 1); setProgress(0); return; }
    if (step >= 7 && !playing) { setStep(0); setProgress(0); setPlaying(true); return; }
    setPlaying((value) => !value);
  }, [playing, reduced, step]);
  const typed = useMemo(() => {
    if (step > 0) return JOURNEY_CONFIG.domain;
    return JOURNEY_CONFIG.domain.slice(0, Math.floor(JOURNEY_CONFIG.domain.length * clamp(progress / 0.72, 0, 1)));
  }, [step, progress]);
  const packet = step === 1 ? { tone: "request" as const, label: `${JOURNEY_CONFIG.domain}?`, route: "dns" as const } :
    step === 3 ? { tone: "response" as const, label: JOURNEY_CONFIG.ip, route: "dns" as const } :
    step === 4 ? { tone: "request" as const, label: "GET /", route: "web" as const } :
    step === 6 ? { tone: "response" as const, label: "200 OK + page data", route: "web" as const } : null;
  const caption = bengali ? JOURNEY_CONFIG.captionsBn[step] : JOURNEY_CONFIG.captions[step];
  
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!rootRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      if (event.code === "Space") { event.preventDefault(); togglePlay(); }
      else if (event.key === "ArrowRight") { event.preventDefault(); goTo(step + 1); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); goTo(step - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, togglePlay, goTo]);

  return <section className="browser-journey" ref={rootRef} aria-label="How a browser finds and loads a web page">
    <style>{CSS}</style>
    <div className="bj-inner">
      <header className="bj-heading"><div><span className="bj-eyebrow"><i /> NETWORK JOURNEY <span>· 8 STEPS</span></span><h2>From a web address to a page.</h2><p>Follow one request as it travels from your browser, through DNS, to a web server and back.</p></div>
        <button className={`bj-language ${bengali ? "selected" : ""}`} onClick={() => setBengali((v) => !v)} aria-label="Toggle Bengali captions" aria-pressed={bengali}><span>EN</span><span className="bj-switch" /><span>বাংলা</span></button></header>
      <div className={`bj-stage ${mobile ? "mobile" : ""}`} data-step={step}>
        <div className="bj-cable bj-cable-dns" /><div className="bj-cable bj-cable-web" />
        <div className={`bj-node bj-node-laptop ${step === 0 || step === 4 || step === 7 ? "focused" : ""}`}><BrowserWindow step={step} typed={typed} typing={step === 0 && playing && visible && !reduced} onEnter={() => { if (step === 0) setEnterPressed(true); }} /></div>
        <div className={`bj-node bj-node-dns ${step >= 2 && step <= 4 ? "focused" : ""}`}><div className="bj-station-label"><span className="bj-label-dot" /> DNS SERVER <small>Address book</small></div><Rack kind="dns" active={step === 2 || step === 3} />
          <div className={`bj-index-cards ${step === 2 ? "flipping" : step >= 3 ? "settled" : ""}`} aria-hidden="true"><span>facebook.com</span><b>→</b><span>157.240.22.35</span></div></div>
        <div className={`bj-node bj-node-web ${step >= 5 && step <= 7 ? "focused" : ""}`}><div className="bj-station-label"><span className="bj-label-dot" /> FACEBOOK WEB SERVER <small>Data centre · example</small></div><Rack kind="web" active={step === 5 || step === 6} loaded={step >= 7} />
          {step === 5 && <div className="bj-processing"><span /> Processing request</div>}</div>
        {packet && <Packet {...packet} progress={progress} />}
        {step === 0 && enterPressed && <div className="bj-enter-toast">↵ Enter</div>}
        {step === 7 && <div className="bj-path-summary"><span>User</span><b>→</b><span>Browser</span><b>→</b><span>DNS</span><b>→</b><span>IP</span><b>→</b><span>Server</span><b>→</b><span>Page</span></div>}
        <div className="bj-legend"><span><i className="request-dot" /> Request</span><span><i className="response-dot" /> Response</span></div>
      </div>
      <div className="bj-control-card">
        <div className="bj-caption" aria-live="polite" aria-atomic="true"><span className="bj-step-count">STEP {String(step + 1).padStart(2, "0")} <i>/ 08</i></span><p>{caption}</p></div>
        <div className="bj-progress-dots" role="group" aria-label="Jump to a step">{STEPS.map((name, index) => <button key={name} aria-label={`Go to step ${index + 1}: ${name}`} aria-current={step === index ? "step" : undefined} className={step === index ? "active" : step > index ? "done" : ""} onClick={() => goTo(index)}><span>{String(index + 1).padStart(2, "0")}</span></button>)}</div>
        <div className="bj-controls"><div className="bj-primary-controls"><button className="bj-control-icon" onClick={() => goTo(step - 1)} aria-label="Previous step" disabled={step === 0}><ArrowLeft size={16} /></button>
          <button className="bj-play" onClick={togglePlay} disabled={reduced && step === 7} aria-label={reduced ? "Advance one step without animation" : playing ? "Pause animation" : "Play animation"}>{reduced ? <ArrowRight size={15} /> : playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}<span>{reduced ? "Next step" : playing ? "Pause" : step === 7 ? "Replay" : "Play"}</span></button>
          <button className="bj-control-icon" onClick={() => goTo(step + 1)} aria-label="Next step" disabled={step === 7}><ArrowRight size={16} /></button>
          <button className="bj-control-icon bj-replay" onClick={() => { setStep(0); setProgress(0); setPlaying(!reduced); }} aria-label="Replay from beginning"><RotateCcw size={15} /></button></div>
          <label className="bj-speed"><span>Speed</span><select aria-label="Animation speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select></label>
        </div>
        {reduced && <p className="bj-motion-note">Reduced motion is on · use Next step to explore without animation.</p>}
      </div>
      <footer className="bj-footnote"><span><span className="bj-foot-lock"><LockKeyhole size={11} /></span> A simplified look at how the web works</span><span>Domain names resolve to IP addresses before a browser connects.</span></footer>
    </div>
  </section>;
}

const CSS = `
.browser-journey{--bj-bg:#f5f6f7;--bj-panel:rgba(255,255,255,.82);--bj-surface:#fff;--bj-text:#1c2228;--bj-muted:#727b84;--bj-border:#dfe3e6;--bj-shadow:0 24px 65px rgba(24,35,44,.1);--bj-amber:#d98b27;--bj-teal:#169b8c;background:var(--bj-bg);color:var(--bj-text);font:14px/1.45 "Kalpurush",ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:clamp(26px,5vw,58px) 18px;overflow:hidden;isolation:isolate}
@media(prefers-color-scheme:dark){.browser-journey{--bj-bg:#111416;--bj-panel:rgba(29,34,36,.86);--bj-surface:#202527;--bj-text:#edf0ef;--bj-muted:#9ba4a3;--bj-border:#343d3d;--bj-shadow:0 24px 65px rgba(0,0,0,.32)}}
.browser-journey *{box-sizing:border-box}.bj-inner{max-width:1110px;margin:auto}.bj-heading{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin:0 0 24px}.bj-eyebrow{display:flex;align-items:center;gap:9px;font:600 10px/1.2 ui-monospace,SFMono-Regular,monospace;letter-spacing:.13em;color:var(--bj-muted)}.bj-eyebrow i,.bj-label-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--bj-teal);box-shadow:0 0 0 3px color-mix(in srgb,var(--bj-teal) 13%,transparent)}.bj-eyebrow span{opacity:.6}.bj-heading h2{font-size:clamp(25px,4vw,39px);letter-spacing:-.045em;line-height:1.07;margin:14px 0 9px;font-weight:650}.bj-heading p{margin:0;color:var(--bj-muted);font-size:13px}.bj-language{height:34px;display:flex;align-items:center;gap:9px;border:1px solid var(--bj-border);background:var(--bj-panel);color:var(--bj-muted);border-radius:20px;padding:0 12px;font:600 10px "Kalpurush",ui-sans-serif,system-ui;white-space:nowrap;cursor:pointer}.bj-language .selected,.bj-language.selected{color:var(--bj-text)}.bj-switch{width:22px;height:12px;border-radius:99px;background:#c9d0d1;position:relative}.bj-switch:after{content:"";position:absolute;width:8px;height:8px;top:2px;left:2px;border-radius:50%;background:#fff;transition:transform .2s}.bj-language.selected .bj-switch{background:var(--bj-teal)}.bj-language.selected .bj-switch:after{transform:translateX(10px)}
.bj-stage{height:clamp(370px,46vw,480px);position:relative;border:1px solid var(--bj-border);border-radius:20px;background:radial-gradient(ellipse at 50% 55%,color-mix(in srgb,var(--bj-teal) 6%,transparent),transparent 55%),linear-gradient(145deg,var(--bj-surface),var(--bj-bg));box-shadow:var(--bj-shadow);overflow:hidden}.bj-stage:before{content:"";position:absolute;inset:0;opacity:.32;background-image:linear-gradient(to right,color-mix(in srgb,var(--bj-border) 65%,transparent) 1px,transparent 1px),linear-gradient(to bottom,color-mix(in srgb,var(--bj-border) 65%,transparent) 1px,transparent 1px);background-size:38px 38px;mask-image:linear-gradient(to bottom,transparent,#000 18%,#000 85%,transparent)}.bj-node{position:absolute;z-index:2;transition:filter .25s,transform .25s}.bj-node.focused{filter:drop-shadow(0 0 12px color-mix(in srgb,var(--bj-teal) 20%,transparent))}.bj-node-laptop{left:7%;top:33%;width:36%;max-width:360px}.bj-node-dns{left:47%;top:6%;width:22%;max-width:220px}.bj-node-web{right:5%;top:43%;width:24%;max-width:250px}.bj-cable{position:absolute;z-index:1;border-top:1.5px solid color-mix(in srgb,var(--bj-teal) 45%,var(--bj-border));opacity:.7}.bj-cable:before{content:"";position:absolute;inset:-4px 0;border-top:6px solid color-mix(in srgb,var(--bj-teal) 8%,transparent);filter:blur(3px)}.bj-cable-dns{left:27%;top:74%;width:30%;transform:rotate(-39deg);transform-origin:left center}.bj-cable-web{left:35%;right:25%;top:76%;border-color:color-mix(in srgb,var(--bj-teal) 48%,var(--bj-border))}.bj-station-label{display:flex;align-items:center;gap:7px;font:700 9px/1.2 ui-monospace,SFMono-Regular,monospace;letter-spacing:.07em;color:var(--bj-text);margin:0 0 8px;white-space:nowrap}.bj-station-label small{font:500 9px ui-sans-serif,system-ui;color:var(--bj-muted);letter-spacing:0;margin-left:auto}.bj-laptop>.bj-station-label{margin:9px 0 0;justify-content:center}.bj-label-dot{width:5px;height:5px;box-shadow:none}.bj-rack{border:1px solid color-mix(in srgb,var(--bj-border) 70%,#89918f);border-radius:8px;background:linear-gradient(145deg,#293133,#171c1e);padding:8px 9px 7px;box-shadow:0 12px 26px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.12);color:#c0c9c5}.bj-rack-top,.bj-rack-foot{display:flex;justify-content:space-between;align-items:center;font:600 7px ui-monospace,monospace;letter-spacing:.08em;color:#899492}.bj-rack-status{color:#76a997}.bj-rack-unit{height:23px;margin:5px 0 0;border:1px solid #3a4343;border-radius:3px;background:linear-gradient(180deg,#252c2e,#202628);display:flex;align-items:center;gap:5px;padding:0 6px}.bj-rack-slot{height:3px;width:22px;background:#465050;border-radius:2px}.bj-rack-slot.short{width:11px}.bj-rack-vent{margin-left:auto;color:#4f5958;font-size:9px;letter-spacing:2px}.bj-led{width:4px;height:4px;background:#5d6862;border-radius:50%}.bj-led.teal{background:#3d7468}.bj-rack.is-active .bj-led.lit{background:#e1a24e;box-shadow:0 0 8px #e1a24e;animation:bj-blink .7s infinite alternate}.bj-rack.is-active .bj-led.teal.lit,.bj-rack.is-loaded .bj-led.teal{background:#49c5ac;box-shadow:0 0 8px #49c5ac}.bj-rack-foot{margin-top:6px;font-size:6px}.bj-index-cards{position:absolute;left:50%;top:calc(100% + 10px);display:flex;gap:6px;align-items:center;transform:translateX(-50%);white-space:nowrap;color:var(--bj-muted);font:8px ui-monospace,monospace;opacity:0;transition:opacity .2s}.bj-index-cards span{padding:5px 7px;border:1px solid var(--bj-border);background:var(--bj-panel);border-radius:4px}.bj-index-cards.settled,.bj-index-cards.flipping{opacity:1}.bj-index-cards.flipping span:first-child{animation:bj-flip .18s infinite alternate}.bj-index-cards.flipping span:last-child{animation:bj-flip .22s infinite alternate-reverse}.bj-processing{position:absolute;left:50%;top:calc(100% + 11px);transform:translateX(-50%);white-space:nowrap;color:var(--bj-muted);font-size:9px;display:flex;align-items:center;gap:6px}.bj-processing span{width:12px;height:12px;border:1.5px solid var(--bj-border);border-top-color:var(--bj-teal);border-radius:50%;animation:bj-spin .8s linear infinite}
.bj-laptop{position:relative}.bj-screen-frame{padding:6px 6px 7px;border-radius:10px 10px 4px 4px;background:linear-gradient(130deg,#515b5f,#1a2022 30%,#40484a);box-shadow:0 12px 25px rgba(0,0,0,.22);border:1px solid #59615f}.bj-browser{overflow:hidden;border-radius:5px;background:#fff;color:#252b30;aspect-ratio:1.58;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}.bj-tabbar{height:10%;min-height:21px;background:#e7e9eb;display:flex;align-items:flex-end;padding:0 6px;gap:4px}.bj-tab{height:84%;width:36%;border-radius:4px 4px 0 0;background:#fff;display:flex;align-items:center;gap:5px;padding:0 7px;color:#60666b;font-size:7px}.bj-tab-dot{width:7px;height:7px;border-radius:50%;background:#9da6a6}.bj-tab-close{margin-left:auto}.bj-add-tab{font-size:11px;color:#71797c;padding-bottom:2px}.bj-window-actions{margin-left:auto;align-self:center;color:#81898c;font-size:7px}.bj-toolbar{height:14%;min-height:30px;display:flex;align-items:center;gap:5px;padding:0 6px;background:#fff}.bj-toolbar>button{border:0;background:none;color:#70777a;padding:2px;display:grid;place-items:center;font-size:14px}.bj-address{height:68%;min-height:21px;min-width:0;flex:1;display:flex;align-items:center;gap:6px;border:1px solid #e0e3e5;background:#f3f5f6;border-radius:6px;padding:0 8px;color:#545d60;font-size:8px;cursor:text}.bj-address-text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1}.bj-address-more{font-size:8px;white-space:nowrap}.bj-placeholder{color:#8a9294}.bj-caret{display:inline-block;height:10px;border-left:1px solid #3b4546;vertical-align:-2px;animation:bj-blink .7s steps(2) infinite}.bj-page{height:76%;min-height:0;background:#fff;position:relative;overflow:hidden}.bj-newtab{height:100%;display:flex;align-items:center;flex-direction:column;padding-top:12%;gap:10px;color:#788083}.bj-google-mark{font-size:11px;display:flex;align-items:center;gap:6px;color:#687173}.bj-google-mark svg{color:var(--bj-teal)}.bj-searchbox{height:20px;width:57%;border:1px solid #e9ebec;border-radius:15px;display:flex;align-items:center;gap:7px;padding:0 8px;box-shadow:0 2px 5px #0000000b;font-size:6px}.bj-shortcuts{display:flex;gap:18px;font-size:12px;color:#b7c0bf;margin-top:2px}.bj-laptop-base{height:7px;margin:0 -5%;background:linear-gradient(#c0c7c7,#7d8687 45%,#a4acad);clip-path:polygon(5% 0,95% 0,100% 80%,0 80%);border-radius:0 0 10px 10px;position:relative}.bj-laptop-base span{position:absolute;left:44%;width:12%;height:3px;background:#808889;border-radius:0 0 4px 4px}.bj-laptop-foot{width:26%;height:4px;margin:auto;background:#747e7e;border-radius:0 0 4px 4px}.bj-packet{position:absolute;z-index:5;transform:translate(-50%,-50%);display:flex;align-items:center;gap:6px;pointer-events:none;transition:left .035s linear,top .035s linear}.bj-packet-dot{width:9px;height:9px;border-radius:50%;background:var(--bj-amber);box-shadow:0 0 0 4px color-mix(in srgb,var(--bj-amber) 18%,transparent),0 0 15px var(--bj-amber);flex:none}.bj-packet.response .bj-packet-dot{background:var(--bj-teal);box-shadow:0 0 0 4px color-mix(in srgb,var(--bj-teal) 18%,transparent),0 0 15px var(--bj-teal)}.bj-packet-chip{background:var(--bj-panel);border:1px solid color-mix(in srgb,var(--bj-amber) 45%,var(--bj-border));color:var(--bj-text);box-shadow:0 4px 12px #00000012;border-radius:5px;padding:4px 7px;font:600 8px ui-monospace,monospace;white-space:nowrap}.bj-packet.response .bj-packet-chip{border-color:color-mix(in srgb,var(--bj-teal) 45%,var(--bj-border))}.bj-enter-toast{position:absolute;z-index:4;left:31%;top:42%;padding:5px 9px;border-radius:5px;background:#fff;border:1px solid var(--bj-border);box-shadow:0 4px 14px #0002;font:10px ui-monospace,monospace;animation:bj-reveal .2s}.bj-path-summary{position:absolute;z-index:4;bottom:9%;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:clamp(3px,1vw,12px);padding:8px 12px;border:1px solid var(--bj-border);border-radius:8px;background:var(--bj-panel);box-shadow:0 6px 20px #00000012;white-space:nowrap;font:600 clamp(7px,1vw,10px) ui-monospace,monospace;animation:bj-reveal .5s}.bj-path-summary b{color:var(--bj-teal)}.bj-legend{position:absolute;right:14px;bottom:12px;display:flex;gap:12px;color:var(--bj-muted);font-size:8px}.bj-legend span{display:flex;align-items:center;gap:5px}.bj-legend i{width:6px;height:6px;border-radius:50%;background:var(--bj-amber)}.bj-legend i.response-dot{background:var(--bj-teal)}
.bj-control-card{margin-top:12px;border:1px solid var(--bj-border);border-radius:14px;background:var(--bj-panel);backdrop-filter:blur(14px);padding:15px 18px 12px;box-shadow:0 8px 25px #00000008}.bj-caption{display:flex;align-items:center;gap:14px;min-height:38px}.bj-step-count{white-space:nowrap;font:700 9px ui-monospace,monospace;letter-spacing:.06em;color:var(--bj-teal)}.bj-step-count i{font-style:normal;color:var(--bj-muted)}.bj-caption p{margin:0;color:var(--bj-text);font-size:12px;line-height:1.45}.bj-progress-dots{display:flex;justify-content:space-between;position:relative;margin:12px 0 14px}.bj-progress-dots:before{content:"";position:absolute;height:1px;background:var(--bj-border);left:7px;right:7px;top:6px}.bj-progress-dots button{position:relative;z-index:1;border:0;background:transparent;padding:0;cursor:pointer;color:var(--bj-muted);width:15px;height:15px;border-radius:50%}.bj-progress-dots button:before{content:"";position:absolute;inset:3px;background:#aeb7b6;border-radius:50%;border:2px solid var(--bj-panel)}.bj-progress-dots button.active:before{inset:0;background:var(--bj-teal);box-shadow:0 0 0 3px color-mix(in srgb,var(--bj-teal) 18%,transparent)}.bj-progress-dots button.done:before{background:var(--bj-teal)}.bj-progress-dots button span{position:absolute;top:15px;left:50%;transform:translateX(-50%);font:7px ui-monospace,monospace;opacity:0}.bj-progress-dots button.active span{opacity:1;color:var(--bj-teal)}.bj-controls{display:flex;justify-content:space-between;align-items:center;padding-top:4px}.bj-primary-controls{display:flex;align-items:center;gap:7px}.bj-control-icon,.bj-play{height:32px;border:1px solid var(--bj-border);background:var(--bj-surface);color:var(--bj-text);border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer}.bj-control-icon{width:34px}.bj-control-icon:disabled{opacity:.38;cursor:not-allowed}.bj-play{gap:7px;padding:0 13px;background:var(--bj-text);color:var(--bj-bg);border-color:var(--bj-text);font-size:11px;font-weight:650}.bj-replay{margin-left:3px}.bj-speed{display:flex;align-items:center;gap:8px;color:var(--bj-muted);font-size:10px}.bj-speed select{appearance:none;border:1px solid var(--bj-border);border-radius:7px;padding:7px 25px 7px 9px;background:var(--bj-surface);color:var(--bj-text);font:600 10px "Kalpurush",ui-sans-serif,system-ui;cursor:pointer}.bj-motion-note{margin:9px 0 0;color:var(--bj-muted);font-size:10px}.bj-footnote{display:flex;justify-content:space-between;gap:12px;margin-top:12px;color:var(--bj-muted);font-size:9px}.bj-footnote>span:first-child{display:flex;align-items:center;gap:6px}.bj-foot-lock{color:var(--bj-teal)}

/* The user sits alongside the screen, leaving the simulated page readable. */
.bj-user{position:absolute;z-index:3;pointer-events:none;width:68%;height:auto;left:-16%;top:5%;overflow:visible;filter:drop-shadow(0 5px 4px #0002)}
.bj-user-arm{transform-box:fill-box;transform-origin:10% 10%}.bj-user.is-typing .bj-user-arm-front{animation:bj-type .32s ease-in-out infinite alternate}.bj-user.is-typing .bj-user-arm-back{animation:bj-type .4s ease-in-out infinite alternate-reverse}
@keyframes bj-type{to{transform:translateY(2px) rotate(2deg)}}
.bj-login{height:100%;background:#f0f2f5;position:relative;display:flex;align-items:center;justify-content:center;gap:7%;padding:3% 7%;color:#1c1e21;animation:bj-reveal .4s both}
.bj-login-brand{width:42%;display:flex;flex-direction:column;gap:4px}.bj-login-brand strong{font:bold clamp(12px,2.2vw,25px)/1 ui-sans-serif,system-ui;color:#1877f2;letter-spacing:-.06em}.bj-login-brand span{font:clamp(6px,.75vw,9px)/1.25 ui-sans-serif,system-ui}
.bj-login-card{width:48%;background:#fff;border-radius:5px;padding:5%;display:flex;flex-direction:column;gap:4px;box-shadow:0 3px 10px #0002;text-align:center;font:clamp(5px,.6vw,7px)/1.2 ui-sans-serif,system-ui;color:#1877f2}.bj-login-field{text-align:left;border:1px solid #dddfe2;border-radius:3px;padding:4px;color:#8b949e}.bj-login-button{border-radius:3px;background:#1877f2;color:#fff;font-weight:bold;padding:4px}.bj-login-divider{height:1px;background:#dadde1}.bj-login-create{align-self:center;background:#42b72a;border-radius:3px;color:white;padding:4px;font-weight:bold}.bj-login-note{position:absolute;bottom:2px;right:4px;font:600 5px ui-monospace,monospace;color:#67727c}
@media(max-width:700px){.bj-user{left:-12%;width:58%;top:10%}.bj-login-brand strong{font-size:clamp(13px,4vw,23px)}.bj-login-brand span{font-size:clamp(6px,1.6vw,9px)}.bj-login-card{font-size:clamp(5px,1.4vw,7px)}}

@keyframes bj-spin{to{transform:rotate(360deg)}}@keyframes bj-blink{to{opacity:.3}}@keyframes bj-flip{to{transform:rotateX(65deg) translateY(-2px);filter:brightness(1.5)}}@keyframes bj-reveal{to{opacity:1;transform:translateY(0)}}
.browser-journey button:focus-visible,.browser-journey select:focus-visible{outline:2px solid var(--bj-teal);outline-offset:3px}@media(max-width:700px){.browser-journey{padding:30px 14px}.bj-heading{align-items:flex-start}.bj-heading h2{font-size:clamp(24px,7vw,34px)}.bj-heading p{max-width:440px}.bj-stage{height:850px;border-radius:15px}.bj-node-laptop{left:9%;top:3%;width:82%;max-width:430px}.bj-node-dns{left:20%;top:36%;width:60%;max-width:270px}.bj-node-web{left:18%;right:auto;top:68%;width:64%;max-width:290px}.bj-station-label{justify-content:center}.bj-cable{left:50%;width:1px;height:20%;top:28%;border-top:0;border-left:1.5px solid color-mix(in srgb,var(--bj-teal) 50%,var(--bj-border));transform:none}.bj-cable:before{inset:0 -3px;border-top:0;border-left:6px solid color-mix(in srgb,var(--bj-teal) 8%,transparent)}.bj-cable-web{top:49%;height:19%}.bj-cable-dns{top:25%;height:13%}.bj-laptop>.bj-station-label{margin-top:8px}.bj-index-cards{top:calc(100% + 8px)}.bj-processing{top:calc(100% + 9px)}.bj-legend{bottom:12px;right:12px}.bj-path-summary{bottom:8%;gap:4px;padding:7px 8px}.bj-footnote{flex-direction:column}.bj-caption{align-items:flex-start;flex-direction:column;gap:6px;padding:2px 0}.bj-progress-dots{margin-top:14px}.bj-control-card{padding:13px}.bj-control-icon{width:32px}.bj-play{padding:0 11px}}
@media(max-width:390px){.bj-stage{height:790px}.bj-node-dns{top:35%}.bj-node-web{top:67%}.bj-station-label{font-size:8px}.bj-station-label small{font-size:8px}.bj-rack-unit{height:20px}.bj-path-summary{font-size:6px}.bj-replay{display:none}.bj-language{gap:6px;padding:0 8px}}
@media(prefers-reduced-motion:reduce){.browser-journey *, .browser-journey *:before,.browser-journey *:after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.01ms!important}}
`;
