import { useEffect, useRef, useState } from "react";
import {
  AppWindow,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  CircuitBoard,
  Cpu,
  Download,
  ExternalLink,
  Fingerprint,
  Laptop,
  Maximize2,
  Monitor,
  Network,
  Pause,
  Play,
  PlugZap,
  Send,
  ShieldCheck,
  Smartphone,
  Wifi,
  X,
  type LucideIcon,
} from "lucide-react";

type Direction = "send" | "receive";

interface PhotoCredit {
  src: string;
  alt: string;
  title: string;
  caption: string;
  source: string;
  author: string;
  license: string;
}

interface DevicePhoto extends PhotoCredit {
  id: string;
  number: string;
  tag: string;
  device: string;
  connection: string;
  description: string;
  points: string[];
  icon: LucideIcon;
}

const PCIE_PHOTO: PhotoCredit = {
  src: "/media/nic-pcie-card.jpg",
  alt: "একটি বাস্তব Intel 82574L PCI Express Ethernet NIC—সবুজ সার্কিট বোর্ড, RJ-45 পোর্ট ও PCIe কানেক্টর",
  title: "আলাদা PCIe Ethernet NIC",
  caption: "Intel 82574L Gigabit Ethernet NIC · PCI Express ×1",
  source:
    "https://commons.wikimedia.org/wiki/File:An_Intel_82574L_Gigabit_Ethernet_NIC,_PCI_Express_x1_card.jpg",
  author: "Dsimic / Wikimedia Commons",
  license: "CC BY-SA 3.0",
};

const DEVICE_PHOTOS: DevicePhoto[] = [
  {
    id: "onboard",
    number: "০১",
    tag: "INTEGRATED",
    device: "ডেস্কটপ / মাদারবোর্ড",
    connection: "মাদারবোর্ডেই soldered controller",
    description:
      "এখন বেশিরভাগ ডেস্কটপে আলাদা NIC কার্ড লাগে না। Ethernet controller চিপটি মাদারবোর্ডের ওপরেই বসানো থাকে।",
    points: [
      "Controller চিপটি মাদারবোর্ডের সঙ্গে সরাসরি যুক্ত থাকে।",
      "RJ-45 পোর্টটি কম্পিউটারের পেছন থেকে দেখা যায়।",
      "অপারেটিং সিস্টেম driver-এর মাধ্যমে এটি নিয়ন্ত্রণ করে।",
    ],
    src: "/media/nic-onboard-chip.jpg",
    alt: "মাদারবোর্ডে সোল্ডার করা বাস্তব Realtek RTL8101L Ethernet controller চিপের কাছ থেকে তোলা ছবি",
    title: "মাদারবোর্ডে integrated Ethernet NIC",
    caption: "Realtek RTL8101L Ethernet controller · motherboard-এ সোল্ডার করা",
    source: "https://commons.wikimedia.org/wiki/File:Realtek_rtl8101l_fast_ethernet_controller.JPG",
    author: "fuatse_tdkr / Wikimedia Commons",
    license: "Public domain",
    icon: Monitor,
  },
  {
    id: "laptop",
    number: "০২",
    tag: "M.2 + ANTENNA",
    device: "ল্যাপটপের ভেতরে",
    connection: "M.2 slot + দুইটি antenna lead",
    description:
      "অনেক ল্যাপটপে ছোট Wi-Fi NIC একটি M.2 socket-এ বসে। সাদা ও কালো সূক্ষ্ম তার দুটি কার্ডটিকে ভেতরের antenna-র সঙ্গে যুক্ত করে।",
    points: [
      "M.2 connector মাদারবোর্ডের সঙ্গে ডাটা ও power-এর পথ তৈরি করে।",
      "MAIN/AUX antenna lead radio signal পাঠাতে ও নিতে সাহায্য করে।",
      "কিছু পাতলা ল্যাপটপে module-এর বদলে চিপ সরাসরি soldered থাকে।",
    ],
    src: "/media/nic-laptop-installed.jpg",
    alt: "ল্যাপটপের মাদারবোর্ডে বসানো ও স্ক্রু দিয়ে আটকানো বাস্তব Wi-Fi M.2 কার্ড",
    title: "ল্যাপটপে বসানো Wi-Fi NIC",
    caption: "একটি Framework মাদারবোর্ডে বসানো M.2 Wi-Fi card",
    source: "https://guides.frame.work/Guide/Cooler+Master+Mainboard+Case+Quick+Start+Guide/166",
    author: "Framework Guides",
    license: "Source attribution",
    icon: Laptop,
  },
  {
    id: "mobile",
    number: "০৩",
    tag: "TINY CHIP",
    device: "ফোন ও ট্যাবলেট",
    connection: "Logic board-এ integrated Wi-Fi chip",
    description:
      "ফোন বা ট্যাবলেটে আলাদা কার্ড দেখা যায় না। ছোট একটি Wi-Fi/Bluetooth chip মাদারবোর্ডে soldered থাকে এবং ডিভাইসের ভেতরের antenna ব্যবহার করে।",
    points: [
      "ছবির Broadcom চিপটিতে Wi-Fi ও Bluetooth-এর অংশ একসঙ্গে আছে।",
      "RJ-45 পোর্ট ছাড়াই radio wave-এর মাধ্যমে সংযোগ হয়।",
      "অন্য চিপের মতো দেখতে হলেও এটিই ওই ডিভাইসের wireless NIC-এর কাজ করে।",
    ],
    src: "/media/nic-mobile-chip.jpg",
    alt: "Galaxy Tab-এর মাদারবোর্ডে বসানো বাস্তব Broadcom Wi-Fi ও Bluetooth চিপ",
    title: "ট্যাবলেটে integrated wireless NIC",
    caption: "Galaxy Tab-এর Broadcom BCM4329 Wi-Fi / Bluetooth chip",
    source:
      "https://commons.wikimedia.org/wiki/File:Samsung_Galaxy_Tab_GT-P1000_-_motherboard_-_Broadcom_BCM4329HKUBG-8577.jpg",
    author: "© Raimond Spekking / Wikimedia Commons",
    license: "CC BY-SA 4.0",
    icon: Smartphone,
  },
];

const NIC_FUNCTIONS: { icon: LucideIcon; title: string; text: string; en: string }[] = [
  {
    icon: PlugZap,
    title: "সংযোগের পথ তৈরি",
    text: "Ethernet পোর্ট বা antenna-র মাধ্যমে ডিভাইসকে কেবল অথবা wireless network-এর সঙ্গে যুক্ত করে।",
    en: "PHYSICAL CONNECTION",
  },
  {
    icon: Fingerprint,
    title: "ফ্রেম ও MAC বুঝে চলা",
    text: "লোকাল নেটওয়ার্কে source ও destination MAC address ব্যবহার করে ডাটার frame সঠিক গন্তব্যে পৌঁছাতে সাহায্য করে।",
    en: "FRAMING + ADDRESSING",
  },
  {
    icon: ArrowLeftRight,
    title: "ডাটা ও সংকেতে রূপান্তর",
    text: "পাঠানোর সময় বিটকে electrical বা radio signal-এ বদলায়; গ্রহণের সময় সংকেত থেকে আবার ডাটা তৈরি করে।",
    en: "TWO-WAY CONVERSION",
  },
  {
    icon: ShieldCheck,
    title: "যাচাই ও error শনাক্ত",
    text: "ফ্রেমের ঠিকানা ও error-checking তথ্য দেখে নষ্ট বা অন্য ডিভাইসের জন্য আসা ডাটা OS-এ পাঠানো থেকে বিরত রাখে।",
    en: "FILTERING + CHECKING",
  },
];

interface FlowStep {
  title: string;
  en: string;
  body: string;
  icon: LucideIcon;
}

const FLOW: Record<Direction, FlowStep[]> = {
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
      body: "NIC আগত electrical বা radio signal বুঝে সেটিকে আবার ডিজিটাল বিট ও frame-এ রূপান্তরিত করে—অর্থাৎ পাঠানোর প্রক্রিয়ার বিপরীত কাজ করে।",
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

const BN_NUMBERS = ["০১", "০২", "০৩", "০৪"];

function scrollToTop() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
}

export default function App() {
  const [direction, setDirection] = useState<Direction>("send");
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoCredit | null>(null);
  const photoTrigger = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setActiveStep((current) => (current + 1) % FLOW[direction].length);
    }, 1400);
    return () => window.clearInterval(timer);
  }, [direction, isPlaying]);

  useEffect(() => {
    if (!selectedPhoto) return;
    const previousOverflow = document.body.style.overflow;
    const background = document.querySelectorAll<HTMLElement>(".site-header, #main-content, .site-footer");
    document.body.style.overflow = "hidden";
    background.forEach((element) => { element.inert = true; });
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedPhoto(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      background.forEach((element) => { element.inert = false; });
      window.removeEventListener("keydown", handleKey);
      photoTrigger.current?.focus();
    };
  }, [selectedPhoto]);

  const openPhoto = (photo: PhotoCredit, trigger: HTMLButtonElement) => {
    photoTrigger.current = trigger;
    setSelectedPhoto(photo);
  };

  const changeDirection = (nextDirection: Direction) => {
    setDirection(nextDirection);
    setActiveStep(0);
    setIsPlaying(false);
  };

  const currentStep = FLOW[direction][activeStep];

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        মূল কনটেন্টে যান
      </a>

      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href="#top" aria-label="NIC বাংলা গাইড—শুরুতে যান">
            <span className="brand-mark" aria-hidden="true">
              <Network size={22} strokeWidth={1.8} />
            </span>
            <span>
              <strong>NIC</strong>
              <small>বাংলা গাইড</small>
            </span>
          </a>

          <nav className="desktop-nav" aria-label="প্রধান নেভিগেশন">
            <a href="#definition">NIC কী?</a>
            <a href="#devices">ডিভাইসে অবস্থান</a>
            <a href="#how-it-works">NIC-এর কাজ</a>
          </nav>

          <a className="header-link" href="#photos">
            বাস্তব ছবি <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
      </header>

      <main id="main-content">
        <section className="hero" id="top">
          <div className="hero-grid-pattern" aria-hidden="true" />
          <div className="container hero-layout">
            <div className="hero-copy">
              <p className="eyebrow"><span /> NETWORK INTERFACE CARD</p>
              <h1>ডিভাইস আর নেটওয়ার্কের সেতু—<em>NIC</em></h1>
              <p className="hero-lede">
                আপনার কম্পিউটার, ল্যাপটপ বা ফোন কেবল ও Wi-Fi-এর মাধ্যমে ডাটা পাঠায় ও গ্রহণ
                করে—এই হার্ডওয়্যার ইন্টারফেসের মাধ্যমেই।
              </p>
              <div className="hero-actions">
                <a className="button button-primary" href="#devices">
                  ডিভাইসের ভেতরে দেখুন <ArrowRight size={18} aria-hidden="true" />
                </a>
                <a className="button button-secondary" href="#how-it-works">
                  NIC-এর কাজ জানুন
                </a>
              </div>
              <div className="hero-definition">
                <CircuitBoard size={23} aria-hidden="true" />
                <p>
                  <strong>এক লাইনে:</strong> NIC হলো ডিভাইসের অভ্যন্তরীণ ডাটা আর বাইরের
                  নেটওয়ার্ক সংকেতের মধ্যকার দ্বিমুখী হার্ডওয়্যার সংযোগ।
                </p>
              </div>
            </div>

            <div className="hero-visual" id="photos">
              <div className="photo-index technical" aria-hidden="true">REAL HARDWARE / ০১</div>
              <div className="hero-photo-card">
                <button
                  className="hero-photo-button"
                  type="button"
                  onClick={(event) => openPhoto(PCIE_PHOTO, event.currentTarget)}
                  aria-label="PCIe Ethernet NIC-এর ছবি বড় করে দেখুন"
                >
                  <img
                    src={PCIE_PHOTO.src}
                    alt={PCIE_PHOTO.alt}
                    width="960"
                    height="720"
                    fetchPriority="high"
                  />
                  <span className="zoom-badge"><Maximize2 size={15} /> বড় করে দেখুন</span>
                </button>
                <div className="hero-photo-caption">
                  <div>
                    <p className="technical">PCI EXPRESS ×1 / ETHERNET</p>
                    <h2>আলাদা NIC কার্ড</h2>
                  </div>
                  <span className="real-tag"><span /> বাস্তব ছবি</span>
                </div>
              </div>
              <div className="hardware-labels technical" aria-label="ছবিতে দেখা যাওয়া অংশ">
                <span><i>01</i> RJ-45 PORT</span>
                <span><i>02</i> CONTROLLER</span>
                <span><i>03</i> PCIe CONNECTOR</span>
              </div>
            </div>
          </div>

          <div className="container hero-facts">
            <div><PlugZap size={20} /><span><strong>Ethernet</strong> কেবলের সংযোগ</span></div>
            <div><Wifi size={20} /><span><strong>Wi-Fi</strong> বেতার সংযোগ</span></div>
            <div><Fingerprint size={20} /><span><strong>MAC address</strong> লোকাল পরিচয়</span></div>
          </div>
        </section>

        <section className="definition-section" id="definition">
          <div className="container definition-grid">
            <div>
              <p className="section-kicker"><span>০১</span> সহজ সংজ্ঞা</p>
              <h2>NIC মানে <span>Network Interface Card</span></h2>
            </div>
            <div className="definition-copy">
              <p>
                NIC এমন একটি হার্ডওয়্যার ইন্টারফেস, যার মাধ্যমে কোনো ডিভাইস লোকাল নেটওয়ার্কে
                ডাটা <strong>পাঠাতে এবং গ্রহণ করতে</strong> পারে। ব্রাউজার বা অ্যাপ ডাটা তৈরি করে;
                NIC সেই ডাটাকে কেবল বা radio wave-এ পাঠানোর শারীরিক পথ তৈরি করে।
              </p>
              <div className="definition-note">
                <span className="note-icon"><Cpu size={22} /></span>
                <div>
                  <h3>নামে “Card”, কিন্তু এখন সবসময় আলাদা কার্ড নয়</h3>
                  <p>
                    integrated NIC-এর ক্ষেত্রে একে <strong>Network Interface Controller</strong>ও
                    বলা হয়। ছোট একটি চিপ বা module-ই আজ অনেক ডিভাইসে পুরো NIC-এর কাজ সম্পন্ন করে।
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="devices-section" id="devices">
          <div className="container">
            <div className="section-heading light-heading">
              <div>
                <p className="section-kicker"><span>০২</span> বাস্তব ছবিতে দেখুন</p>
                <h2>এখন NIC ডিভাইসের ভেতরে<br />এভাবেই যুক্ত থাকে</h2>
              </div>
              <p>
                একই NIC-এর কাজ—কিন্তু ডিভাইসের আকার ও প্রয়োজন অনুযায়ী এর রূপ ভিন্ন।
                ছবিতে ক্লিক করে বড় করে দেখুন।
              </p>
            </div>

            <div className="device-grid">
              {DEVICE_PHOTOS.map((photo) => {
                const DeviceIcon = photo.icon;
                return (
                  <article className="device-card" key={photo.id}>
                    <button
                      className="device-photo-button"
                      type="button"
                      onClick={(event) => openPhoto(photo, event.currentTarget)}
                      aria-label={`${photo.device}—NIC-এর ছবি বড় করে দেখুন`}
                    >
                      <img
                        src={photo.src}
                        alt={photo.alt}
                        width="800"
                        height="600"
                        loading="lazy"
                      />
                      <span className="device-photo-tag technical">{photo.number} / {photo.tag}</span>
                      <span className="device-zoom"><Maximize2 size={17} /></span>
                    </button>
                    <div className="device-card-body">
                      <div className="device-title-row">
                        <span className="device-icon"><DeviceIcon size={22} /></span>
                        <div>
                          <h3>{photo.device}</h3>
                          <p>{photo.connection}</p>
                        </div>
                      </div>
                      <p className="device-description">{photo.description}</p>
                      <ul>
                        {photo.points.map((point) => (
                          <li key={point}><span aria-hidden="true">↳</span>{point}</li>
                        ))}
                      </ul>
                      <a href={photo.source} target="_blank" rel="noreferrer" className="source-link">
                        ছবির আসল উৎস <ExternalLink size={13} />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="pcie-note">
              <div className="pcie-note-icon"><CircuitBoard size={25} /></div>
              <p>
                <strong>তাহলে আলাদা NIC কার্ড কি এখনো ব্যবহৃত হয়?</strong>
                হ্যাঁ। ডেস্কটপ ও সার্ভারে অতিরিক্ত Ethernet port, দ্রুততর সংযোগ বা পুরোনো NIC
                নষ্ট হলে উপরের ছবির মতো <strong>PCIe expansion card</strong> লাগানো যায়।
              </p>
            </div>
          </div>
        </section>

        <section className="work-section" id="how-it-works">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="section-kicker"><span>০৩</span> NIC-এর কাজ</p>
                <h2>শুধু একটি পোর্ট নয়—<br />চারটি গুরুত্বপূর্ণ কাজ</h2>
              </div>
              <p>
                NIC আপনার ডিভাইসের software ও বাইরের network medium-এর মাঝে কাজ করে।
                তার মূল দায়িত্বগুলো নিচে দেখুন।
              </p>
            </div>

            <div className="function-grid">
              {NIC_FUNCTIONS.map((item, index) => {
                const FunctionIcon = item.icon;
                return (
                  <article className="function-card" key={item.title}>
                    <div className="function-top">
                      <span className="function-icon"><FunctionIcon size={24} /></span>
                      <span className="technical">{BN_NUMBERS[index]}</span>
                    </div>
                    <p className="function-en technical">{item.en}</p>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </article>
                );
              })}
            </div>

            <div className="flow-panel">
              <div className="flow-header">
                <div>
                  <p className="technical flow-eyebrow">INTERACTIVE DATA PATH</p>
                  <h3>একটি ডাটার যাত্রা অনুসরণ করুন</h3>
                </div>
                <div className="direction-tabs" role="group" aria-label="ডাটার দিক বেছে নিন">
                  <button
                    type="button"
                    aria-pressed={direction === "send"}
                    className={direction === "send" ? "active" : ""}
                    onClick={() => changeDirection("send")}
                  >
                    <Send size={15} /> ডাটা পাঠানো
                  </button>
                  <button
                    type="button"
                    aria-pressed={direction === "receive"}
                    className={direction === "receive" ? "active" : ""}
                    onClick={() => changeDirection("receive")}
                  >
                    <Download size={15} /> ডাটা গ্রহণ
                  </button>
                </div>
              </div>

              <div className="flow-progress" aria-hidden="true">
                <span style={{ width: `${((activeStep + 1) / FLOW[direction].length) * 100}%` }} />
              </div>

              <div className="flow-track" role="group" aria-label={direction === "send" ? "ডাটা পাঠানোর ধাপ" : "ডাটা গ্রহণের ধাপ"}>
                {FLOW[direction].map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = activeStep === index;
                  return (
                    <button
                      type="button"
                      className={`flow-step${isActive ? " active" : ""}`}
                      key={step.title}
                      onClick={() => {
                        setActiveStep(index);
                        setIsPlaying(false);
                      }}
                      aria-pressed={isActive}
                    >
                      <span className="flow-step-top">
                        <span className="flow-step-icon"><StepIcon size={22} /></span>
                        <span className="technical">{BN_NUMBERS[index]}</span>
                      </span>
                      <strong>{step.title}</strong>
                      <small className="technical">{step.en}</small>
                    </button>
                  );
                })}
              </div>

              <div className="flow-detail" aria-live="polite">
                <div className="flow-detail-index technical">
                  <span>{BN_NUMBERS[activeStep]}</span>
                  <small>/ ০৪</small>
                </div>
                <div>
                  <p className="technical">{currentStep.en}</p>
                  <h4>{currentStep.title}</h4>
                  <p>{currentStep.body}</p>
                </div>
                <button
                  className="play-button"
                  type="button"
                  onClick={() => setIsPlaying((playing) => !playing)}
                  aria-label={isPlaying ? "ধাপগুলোর animation থামান" : "ধাপগুলোর animation চালান"}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                  {isPlaying ? "থামান" : "ধাপে ধাপে চালান"}
                </button>
              </div>
            </div>

            <div className="mac-note">
              <Fingerprint size={28} />
              <div>
                <h3>MAC address ও IP address কিন্তু এক জিনিস নয়</h3>
                <p>
                  <strong>MAC</strong> NIC-এর link-layer পরিচয় হিসেবে লোকাল নেটওয়ার্কে frame
                  পৌঁছাতে কাজ করে। <strong>IP</strong> হলো logical network address, যা বিভিন্ন
                  নেটওয়ার্কজুড়ে packet route করতে ব্যবহৃত হয়। NIC-এর factory-assigned MAC সাধারণত
                  অনন্য হলেও software দিয়ে তা পরিবর্তন করা যেতে পারে।
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-main">
          <div>
            <a className="brand footer-brand" href="#top">
              <span className="brand-mark"><Network size={22} /></span>
              <span><strong>NIC</strong><small>বাংলা গাইড</small></span>
            </a>
            <p>বাস্তব ছবিতে Network Interface Card—এর অবস্থান ও কাজের সহজ ব্যাখ্যা।</p>
          </div>
          <nav aria-label="ফুটার নেভিগেশন">
            <a href="#definition">NIC কী?</a>
            <a href="#devices">ডিভাইসে অবস্থান</a>
            <a href="#how-it-works">NIC-এর কাজ</a>
          </nav>
          <button className="back-to-top" type="button" onClick={scrollToTop}>
            উপরে ফিরুন <span>↑</span>
          </button>
        </div>

        <div className="container photo-credits">
          <details>
            <summary>ছবির উৎস ও লাইসেন্স <span>৪টি বাস্তব ছবি</span></summary>
            <div className="credit-grid">
              {[PCIE_PHOTO, ...DEVICE_PHOTOS].map((photo) => (
                <a href={photo.source} target="_blank" rel="noreferrer" key={photo.src}>
                  <strong>{photo.title}</strong>
                  <span>{photo.author} · {photo.license}</span>
                  <ExternalLink size={13} />
                </a>
              ))}
            </div>
          </details>
        </div>
        <div className="container footer-bottom technical">
          <span>NETWORK HARDWARE · EXPLAINED IN BANGLA</span>
          <span>NIC / ETHERNET / WI-FI</span>
        </div>
      </footer>

      {selectedPhoto && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-labelledby="photo-dialog-title"
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const focusable = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"),
            );
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
            if (event.target === event.currentTarget) setSelectedPhoto(null);
          }}
        >
          <div className="lightbox-content">
            <button
              className="lightbox-close"
              type="button"
              onClick={() => setSelectedPhoto(null)}
              aria-label="ছবি বন্ধ করুন"
              autoFocus
            >
              <X size={22} />
            </button>
            <img src={selectedPhoto.src} alt={selectedPhoto.alt} />
            <div className="lightbox-caption">
              <div>
                <p className="technical">REAL HARDWARE PHOTOGRAPH</p>
                <h2 id="photo-dialog-title">{selectedPhoto.title}</h2>
                <p>{selectedPhoto.caption}</p>
              </div>
              <a href={selectedPhoto.source} target="_blank" rel="noreferrer">
                {selectedPhoto.author}<br />{selectedPhoto.license} <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
