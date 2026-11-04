import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AppWindow,
  ArrowLeftRight,
  Camera,
  CircuitBoard,
  Download,
  ExternalLink,
  Fingerprint,
  Laptop,
  Maximize2,
  Monitor,
  PlugZap,
  Send,
  ShieldCheck,
  Smartphone,
  X,
  type LucideIcon,
} from "lucide-react";
import { mediaAsset } from "@/lib/network/media";
import { cn } from "@/utils/cn";
import { ChoiceGroup } from "./ui/primitives";

interface NicPhoto {
  id: string;
  title: string;
  en: string;
  src: string;
  alt: string;
  caption: string;
  body: string;
  points: string[];
  source: string;
  author: string;
  license: string;
  icon: LucideIcon;
}

const PHOTOS: NicPhoto[] = [
  {
    id: "pcie",
    title: "আলাদা PCIe Ethernet NIC",
    en: "PCI EXPRESS ×1 / EXPANSION CARD",
    src: "nic-pcie-card.jpg",
    alt: "একটি বাস্তব Intel 82574L PCI Express Ethernet NIC—সবুজ সার্কিট বোর্ড, RJ-45 পোর্ট ও PCIe কানেক্টর",
    caption: "Intel 82574L Gigabit Ethernet NIC · PCI Express ×1",
    body: "ডেস্কটপ বা সার্ভারে অতিরিক্ত Ethernet port, দ্রুততর সংযোগ অথবা নষ্ট onboard NIC-এর বিকল্প দরকার হলে এই ধরনের আলাদা কার্ড motherboard-এর PCIe slot-এ লাগানো হয়।",
    points: ["RJ-45 port-এ Ethernet কেবল ঢোকে", "Controller চিপ NIC-এর প্রধান প্রসেসিং অংশ", "PCIe connector motherboard-এর সঙ্গে ডাটা ও power-এর পথ তৈরি করে"],
    source: "https://commons.wikimedia.org/wiki/File:An_Intel_82574L_Gigabit_Ethernet_NIC,_PCI_Express_x1_card.jpg",
    author: "Dsimic / Wikimedia Commons",
    license: "CC BY-SA 3.0",
    icon: CircuitBoard,
  },
  {
    id: "onboard",
    title: "ডেস্কটপ / মাদারবোর্ড",
    en: "INTEGRATED ETHERNET CONTROLLER",
    src: "nic-onboard-chip.jpg",
    alt: "মাদারবোর্ডে সোল্ডার করা বাস্তব Realtek RTL8101L Ethernet controller চিপের কাছ থেকে তোলা ছবি",
    caption: "Realtek RTL8101L Ethernet controller · motherboard-এ সোল্ডার করা",
    body: "এখন বেশিরভাগ ডেস্কটপে আলাদা NIC কার্ড লাগে না। ছবির মতো Ethernet controller চিপ motherboard-এর ওপরেই soldered থাকে; RJ-45 পোর্টটি কম্পিউটারের পেছন থেকে দেখা যায়।",
    points: ["Controller motherboard-এর সঙ্গে সরাসরি যুক্ত", "অপারেটিং সিস্টেম driver দিয়ে এটি নিয়ন্ত্রণ করে", "এই রূপকে onboard বা integrated NIC বলে"],
    source: "https://commons.wikimedia.org/wiki/File:Realtek_rtl8101l_fast_ethernet_controller.JPG",
    author: "fuatse_tdkr / Wikimedia Commons",
    license: "Public domain",
    icon: Monitor,
  },
  {
    id: "laptop",
    title: "ল্যাপটপের ভেতরে",
    en: "M.2 WIFI CARD + ANTENNA",
    src: "nic-laptop-installed.jpg",
    alt: "ল্যাপটপের মাদারবোর্ডে বসানো ও স্ক্রু দিয়ে আটকানো বাস্তব Wi-Fi M.2 কার্ড",
    caption: "একটি Framework মাদারবোর্ডে বসানো M.2 Wi-Fi card",
    body: "অনেক ল্যাপটপে ছোট Wi-Fi NIC একটি M.2 socket-এ বসে এবং স্ক্রু বা bracket দিয়ে আটকানো থাকে। সাদা ও কালো সূক্ষ্ম তার দুটি কার্ডটিকে ডিভাইসের ভেতরের antenna-র সঙ্গে যুক্ত করে।",
    points: ["M.2 connector motherboard-এর সঙ্গে ডাটা ও power-এর পথ তৈরি করে", "MAIN/AUX lead antenna-র সঙ্গে যায়", "কিছু পাতলা ল্যাপটপে module-এর বদলে চিপ সরাসরি soldered থাকে"],
    source: "https://guides.frame.work/Guide/Cooler+Master+Mainboard+Case+Quick+Start+Guide/166",
    author: "Framework Guides",
    license: "Source attribution",
    icon: Laptop,
  },
  {
    id: "mobile",
    title: "ফোন ও ট্যাবলেট",
    en: "TINY INTEGRATED WIRELESS CHIP",
    src: "nic-mobile-chip.jpg",
    alt: "Galaxy Tab-এর মাদারবোর্ডে বসানো বাস্তব Broadcom Wi-Fi ও Bluetooth চিপ",
    caption: "Galaxy Tab-এর Broadcom BCM4329 Wi-Fi / Bluetooth chip",
    body: "ফোন বা ট্যাবলেটে আলাদা কার্ড দেখা যায় না। ছবির মতো ছোট Wi-Fi/Bluetooth chip motherboard-এ soldered থাকে এবং ডিভাইসের ভেতরের antenna ব্যবহার করে wireless NIC-এর কাজ সম্পন্ন করে।",
    points: ["RJ-45 port ছাড়াই radio wave-এ সংযোগ হয়", "Wi-Fi ও Bluetooth-এর অংশ এক chip-এ থাকতে পারে", "অন্য চিপের মতো দেখতে হলেও এটি wireless NIC-এর কাজ করে"],
    source: "https://commons.wikimedia.org/wiki/File:Samsung_Galaxy_Tab_GT-P1000_-_motherboard_-_Broadcom_BCM4329HKUBG-8577.jpg",
    author: "© Raimond Spekking / Wikimedia Commons",
    license: "CC BY-SA 4.0",
    icon: Smartphone,
  },
];

const FUNCTIONS: { icon: LucideIcon; title: string; en: string; body: string }[] = [
  {
    icon: PlugZap,
    title: "সংযোগের পথ তৈরি",
    en: "PHYSICAL CONNECTION",
    body: "Ethernet port বা antenna-র মাধ্যমে ডিভাইসকে কেবল অথবা wireless network-এর সঙ্গে যুক্ত করে।",
  },
  {
    icon: Fingerprint,
    title: "ফ্রেম ও MAC বুঝে চলা",
    en: "FRAMING + ADDRESSING",
    body: "লোকাল নেটওয়ার্কে source ও destination MAC address ব্যবহার করে ডাটার frame সঠিক গন্তব্যে পৌঁছাতে সাহায্য করে।",
  },
  {
    icon: ArrowLeftRight,
    title: "ডাটা ও সংকেতে রূপান্তর",
    en: "TWO-WAY CONVERSION",
    body: "পাঠানোর সময় বিটকে electrical বা radio signal-এ বদলায়; গ্রহণের সময় সংকেত থেকে আবার ডাটা তৈরি করে।",
  },
  {
    icon: ShieldCheck,
    title: "যাচাই ও error শনাক্ত",
    en: "FILTERING + CHECKING",
    body: "ফ্রেমের ঠিকানা ও error-checking তথ্য দেখে নষ্ট বা অন্য ডিভাইসের জন্য আসা ডাটা OS-এ পাঠানো থেকে বিরত রাখে।",
  },
];

interface FlowStep {
  title: string;
  en: string;
  body: string;
  icon: LucideIcon;
}

const FLOW: Record<"send" | "receive", FlowStep[]> = {
  send: [
    {
      title: "অ্যাপ ও OS ডাটা দেয়",
      en: "APP + OPERATING SYSTEM",
      body: "ব্রাউজার বা অন্য অ্যাপের ডাটা অপারেটিং সিস্টেম packet আকারে প্রস্তুত করে। Network driver সেটি NIC-এর কাছে পৌঁছে দেয়।",
      icon: AppWindow,
    },
    {
      title: "NIC-এর জন্য frame প্রস্তুত",
      en: "FRAME + MAC ADDRESS",
      body: "NIC ও তার driver-এর সমন্বয়ে লোকাল লিংকের জন্য frame প্রস্তুত হয়। এতে source ও destination MAC-এর মতো তথ্য এবং error যাচাইয়ের ব্যবস্থা থাকে।",
      icon: Fingerprint,
    },
    {
      title: "বিট হয়ে ওঠে সংকেত",
      en: "BITS → SIGNALS",
      body: "NIC ডিজিটাল বিটকে মাধ্যম অনুযায়ী রূপান্তরিত করে—Ethernet কেবলের জন্য electrical signal, আর Wi-Fi-এর জন্য radio signal।",
      icon: ArrowLeftRight,
    },
    {
      title: "পোর্ট বা antenna পাঠায়",
      en: "TO THE NETWORK",
      body: "RJ-45 পোর্ট কেবলে electrical signal পাঠায়। Wireless NIC-এর ক্ষেত্রে antenna radio wave ছাড়ে; এরপর router বা switch ডাটাটি এগিয়ে দেয়।",
      icon: Send,
    },
  ],
  receive: [
    {
      title: "পোর্ট বা antenna সংকেত নেয়",
      en: "FROM THE NETWORK",
      body: "কেবল থেকে electrical signal অথবা antenna থেকে radio signal NIC-এর কাছে আসে। NIC তখন ওই ডিভাইসের নেটওয়ার্ক প্রবেশদ্বার হিসেবে কাজ করছে।",
      icon: Download,
    },
    {
      title: "সংকেত থেকে আবার বিট",
      en: "SIGNALS → BITS",
      body: "NIC আগত electrical বা radio signal বুঝে সেটিকে আবার ডিজিটাল বিট ও frame-এ রূপান্তরিত করে—পাঠানোর প্রক্রিয়ার বিপরীত কাজ করে।",
      icon: ArrowLeftRight,
    },
    {
      title: "ঠিকানা ও error যাচাই",
      en: "FILTER + VERIFY",
      body: "ফ্রেমটি এই NIC-এর জন্য এসেছে কি না এবং error-check বা FCS মিলছে কি না দেখা হয়। ভুল বা ক্ষতিগ্রস্ত frame স্বাভাবিক অবস্থায় OS-এ দেওয়া হয় না।",
      icon: ShieldCheck,
    },
    {
      title: "ডাটা পৌঁছায় OS-এ",
      en: "DRIVER → OS → APP",
      body: "বৈধ frame থেকে payload বের করে NIC driver-এর মাধ্যমে অপারেটিং সিস্টেমকে দেওয়া হয়। OS সেটি সঠিক অ্যাপে পৌঁছে দেয়—যেমন আপনার ব্রাউজারে।",
      icon: AppWindow,
    },
  ],
};

function PhotoButton({ photo, onOpen }: { photo: NicPhoto; onOpen: (photo: NicPhoto, trigger: HTMLButtonElement) => void }) {
  return (
    <button
      type="button"
      className="group relative block h-full w-full cursor-zoom-in overflow-hidden bg-[#111a17] text-left"
      onClick={(event) => onOpen(photo, event.currentTarget)}
      aria-label={`${photo.title}—ছবি বড় করে দেখো`}
    >
      <img
        src={mediaAsset(photo.src)}
        alt={photo.alt}
        width={photo.id === "mobile" ? 500 : 960}
        height={photo.id === "mobile" ? 500 : 720}
        loading="lazy"
        decoding="async"
        className="aspect-[4/3] h-full w-full object-cover transition duration-500 group-hover:scale-[1.035] group-hover:brightness-110"
      />
      <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-[#04060d]/80 px-2.5 py-1 font-mono text-[8.5px] tracking-[0.1em] text-ink backdrop-blur-md">
        <Camera size={11} className="text-signal" /> বাস্তব ছবি
      </span>
      <span className="absolute right-3 bottom-3 grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-[#04060d]/80 text-white backdrop-blur-md">
        <Maximize2 size={15} />
      </span>
    </button>
  );
}

export function NicPhotoGallery() {
  const [selected, setSelected] = useState<NicPhoto | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [featured, ...devices] = PHOTOS;
  const FeaturedIcon = featured.icon;

  useEffect(() => {
    if (!selected) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
      triggerRef.current?.focus();
    };
  }, [selected]);

  const openPhoto = (photo: NicPhoto, trigger: HTMLButtonElement) => {
    triggerRef.current = trigger;
    setSelected(photo);
  };

  return (
    <div className="space-y-5">
      <article className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.025] md:grid md:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <PhotoButton photo={featured} onOpen={openPhoto} />
        <div className="flex flex-col justify-center p-5 md:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-signal/10 text-signal">
              <FeaturedIcon size={22} />
            </span>
            <div>
              <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-signal">{featured.en}</p>
              <h3 className="bangla mt-1 text-[18px] font-semibold text-white">{featured.title}</h3>
            </div>
          </div>
          <p className="bangla mt-4 text-[13px] leading-relaxed text-muted">{featured.body}</p>
          <ul className="mt-4 space-y-2 border-t border-white/[0.08] pt-4">
            {featured.points.map((point) => (
              <li key={point} className="bangla flex gap-2 text-[12px] leading-relaxed text-muted">
                <span className="mt-[0.65em] h-1 w-1 shrink-0 rounded-full bg-signal" />{point}
              </li>
            ))}
          </ul>
        </div>
      </article>

      <div className="grid gap-4 md:grid-cols-3">
        {devices.map((photo) => {
          const DeviceIcon = photo.icon;
          return (
            <article key={photo.id} className="net-photo-card">
              <PhotoButton photo={photo} onOpen={openPhoto} />
              <div className="flex flex-1 flex-col p-4 md:p-5">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-signal/10 text-signal">
                    <DeviceIcon size={18} />
                  </span>
                  <div>
                    <h3 className="bangla text-[15px] font-semibold leading-snug text-white">{photo.title}</h3>
                    <p className="mt-0.5 font-mono text-[7.5px] uppercase tracking-[0.11em] text-faint">{photo.en}</p>
                  </div>
                </div>
                <p className="bangla mt-3 text-[12.5px] leading-relaxed text-muted">{photo.body}</p>
                <ul className="mt-3 space-y-2 border-t border-white/[0.07] pt-3">
                  {photo.points.map((point) => (
                    <li key={point} className="bangla flex gap-2 text-[11.5px] leading-relaxed text-faint">
                      <span className="mt-[0.65em] h-1 w-1 shrink-0 rounded-full bg-signal/70" />{point}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </div>

      <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <summary className="bangla cursor-pointer font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">
          ছবির সূত্র ও লাইসেন্স ({PHOTOS.length})
        </summary>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {PHOTOS.map((photo) => (
            <li key={photo.id} className="bangla rounded-xl border border-white/[0.07] p-3 text-[11px] leading-relaxed text-muted">
              <a href={photo.source} target="_blank" rel="noreferrer noopener" className="inline-flex items-start gap-1.5 text-ink underline decoration-white/25 underline-offset-2 hover:text-signal">
                {photo.title}<ExternalLink size={11} className="mt-1 shrink-0" />
              </a>
              <span className="mt-1 block text-faint">{photo.author} · {photo.license} · উপস্থাপনার জন্য crop/scale</span>
            </li>
          ))}
        </ul>
      </details>

      {selected && createPortal(
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-[#02050c]/95 p-3 backdrop-blur-md sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="nic-photo-title"
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"));
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <div className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl overflow-auto rounded-2xl border border-white/15 bg-[#0b1120] shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
            <button type="button" autoFocus onClick={() => setSelected(null)} aria-label="ছবি বন্ধ করো" className="absolute top-3 right-3 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-[#04060d]/85 text-white hover:border-signal/60 hover:text-signal">
              <X size={20} />
            </button>
            <img src={mediaAsset(selected.src)} alt={selected.alt} className="max-h-[68dvh] w-full object-contain" />
            <div className="flex flex-col gap-3 border-t border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
              <div>
                <p className="font-mono text-[8px] uppercase tracking-[0.15em] text-signal">REAL HARDWARE PHOTOGRAPH</p>
                <h3 id="nic-photo-title" className="bangla mt-1 text-[17px] font-semibold text-white">{selected.title}</h3>
                <p className="bangla mt-1 text-[11.5px] text-muted">{selected.caption}</p>
              </div>
              <a href={selected.source} target="_blank" rel="noreferrer noopener" className="bangla inline-flex shrink-0 items-center gap-1.5 text-[10.5px] text-faint hover:text-signal">
                {selected.author} · {selected.license}<ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

export function NicWorkGuide() {
  const [direction, setDirection] = useState<"send" | "receive">("send");
  const [activeStep, setActiveStep] = useState(0);
  const currentStep = FLOW[direction][activeStep];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FUNCTIONS.map((item, index) => {
          const FunctionIcon = item.icon;
          return (
            <article key={item.title} className="panel panel-hover p-4">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-signal/10 text-signal"><FunctionIcon size={20} /></span>
                <span className="font-mono text-[9px] text-faint">0{index + 1}</span>
              </div>
              <p className="mt-4 font-mono text-[7.5px] uppercase tracking-[0.13em] text-faint">{item.en}</p>
              <h3 className="bangla mt-1.5 text-[15px] font-semibold text-white">{item.title}</h3>
              <p className="bangla mt-2 text-[12px] leading-relaxed text-muted">{item.body}</p>
            </article>
          );
        })}
      </div>

      <div className="rounded-2xl border border-white/12 bg-[#070d18] p-4 md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-signal">INTERACTIVE DATA PATH</p>
            <h3 className="bangla mt-1 text-[17px] font-semibold text-white">একটি ডাটার যাত্রা অনুসরণ করো</h3>
          </div>
          <ChoiceGroup
            label="ডাটার দিক বেছে নাও"
            value={direction}
            onChange={(next) => {
              setDirection(next as "send" | "receive");
              setActiveStep(0);
            }}
            options={[{ id: "send", label: "ডাটা পাঠানো" }, { id: "receive", label: "ডাটা গ্রহণ" }]}
            size="sm"
          />
        </div>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4" role="group" aria-label="NIC-এর ডাটা প্রক্রিয়ার ধাপ">
          {FLOW[direction].map((step, index) => {
            const StepIcon = step.icon;
            const active = index === activeStep;
            return (
              <button
                type="button"
                key={step.title}
                aria-pressed={active}
                onClick={() => setActiveStep(index)}
                className={cn(
                  "rounded-xl border p-3.5 text-left transition-colors",
                  active ? "border-signal/60 bg-signal/10" : "border-white/10 bg-white/[0.02] hover:border-white/25",
                )}
              >
                <div className="flex items-center justify-between">
                  <StepIcon size={19} className={active ? "text-signal" : "text-faint"} />
                  <span className={cn("font-mono text-[9px]", active ? "text-signal" : "text-faint")}>0{index + 1}</span>
                </div>
                <span className={cn("bangla mt-3 block text-[12.5px] font-medium leading-snug", active ? "text-white" : "text-muted")}>{step.title}</span>
                <span className="mt-1 block truncate font-mono text-[7px] uppercase tracking-[0.09em] text-faint">{step.en}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4" aria-live="polite">
          <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-signal">ধাপ 0{activeStep + 1} · {currentStep.en}</p>
          <h4 className="bangla mt-1.5 text-[15px] font-semibold text-white">{currentStep.title}</h4>
          <p className="bangla mt-1.5 text-[12.5px] leading-relaxed text-muted">{currentStep.body}</p>
        </div>
      </div>

      <aside className="flex items-start gap-3 rounded-2xl border border-warn/25 bg-warn/[0.05] p-4">
        <Fingerprint size={21} className="mt-0.5 shrink-0 text-warn" />
        <div>
          <h3 className="bangla text-[13px] font-semibold text-white">MAC address ও IP address এক জিনিস নয়</h3>
          <p className="bangla mt-1.5 text-[12px] leading-relaxed text-muted">
            <strong className="font-mono text-[11px] text-ink">MAC</strong> NIC-এর link-layer পরিচয় হিসেবে লোকাল নেটওয়ার্কে frame পৌঁছাতে কাজ করে। <strong className="font-mono text-[11px] text-ink">IP</strong> logical network address, যা বিভিন্ন নেটওয়ার্কজুড়ে packet route করতে ব্যবহৃত হয়। NIC-এর factory-assigned MAC সাধারণত অনন্য হলেও software দিয়ে তা পরিবর্তন করা যেতে পারে।
          </p>
        </div>
      </aside>
    </div>
  );
}
