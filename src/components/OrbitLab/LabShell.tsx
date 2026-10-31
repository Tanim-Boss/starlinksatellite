import { ArrowUpRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import "./lab.css";

export function OrbitalMark() {
  return (
    <span className="lab-brand-mark" aria-hidden="true">
      <svg viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="4.4" fill="currentColor" />
        <ellipse cx="18" cy="18" rx="14.3" ry="6.2" stroke="currentColor" strokeWidth="1.3" transform="rotate(-34 18 18)" />
        <circle cx="28.5" cy="10.6" r="2.1" fill="#b6e9f6" />
      </svg>
    </span>
  );
}

const nav = [
  { label: "Simulation", href: "#/@simulation" },
  { label: "The comparison", href: "#/@comparison" },
  { label: "How it works", href: "#/@how-it-works" },
];

export function LabHeader() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  return (
    <header className="lab-header">
      <div className="lab-header-inner lab-container">
        <a className="lab-brand" href="#/" aria-label="Orbital field guide home" onClick={() => setOpen(false)}>
          <OrbitalMark />
          <span className="lab-brand-copy"><strong>ORBITAL</strong><small>THE SATELLITE FIELD GUIDE</small></span>
        </a>
        <nav className="lab-desktop-nav" aria-label="Main navigation">
          {nav.map((item) => <a key={item.label} href={item.href}>{item.label}</a>)}
        </nav>
        <a className="lab-header-action" href="#/@simulation">
          <span className="lab-live-dot" /> EXPLORE THE SIMULATION <ArrowUpRight size={14} />
        </a>
        <button type="button" className="lab-menu-button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <nav className="lab-mobile-nav" aria-label="Mobile navigation">
          {nav.map((item) => <a key={item.label} href={item.href} onClick={() => setOpen(false)}>{item.label}<ArrowUpRight size={15} /></a>)}
        </nav>
      )}
    </header>
  );
}

export function LabFooter() {
  return (
    <footer className="lab-footer" id="about">
      <div className="lab-container lab-footer-inner">
        <div>
          <a className="lab-brand" href="#/" aria-label="Orbital field guide home">
            <OrbitalMark />
            <span className="lab-brand-copy"><strong>ORBITAL</strong><small>THE SATELLITE FIELD GUIDE</small></span>
          </a>
          <p>An independent visual guide to the things above us.</p>
        </div>
        <div className="lab-footer-notes">
          <p>Inspired by the supplied Branch Education reference animation.</p>
          <p>Educational model · Not live tracking · Not affiliated with SpaceX.</p>
          <a href="https://www.youtube.com/watch?v=qs2QcycggWU" target="_blank" rel="noreferrer">Watch the original explainer <ArrowUpRight size={13} /></a>
        </div>
      </div>
      <div className="lab-container lab-footer-bottom"><span>MADE FOR THE CURIOUS</span><span>END OF TRANSMISSION <span className="lab-live-dot" /></span></div>
    </footer>
  );
}
