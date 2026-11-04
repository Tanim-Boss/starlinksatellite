/**
 * Network media, part two: the physical cables and their connectors, and the
 * wireless media that carry the same data with no wire at all.
 *
 * `copy.ts` owns the three-way comparison (twisted pair / fiber / Wi-Fi). This
 * file owns the catalogue beside it: one entry per cable with its connector-free
 * illustrative photo, parts and connector, one entry per wireless medium, and
 * the credits for the photographs shipped in `public/media/`.
 *
 * Bangla first, English technical term kept in Latin script, same as the rest
 * of the lab.
 */

/* -------------------------------------------------------------------------- */
/* Wired cables                                                               */
/* -------------------------------------------------------------------------- */

export interface CableConnector {
  /** Bangla name, e.g. "F কানেক্টর". */
  name: string;
  /** English name, e.g. "F-type connector". */
  en: string;
  /** What the connector is for, in one Bangla sentence. */
  note: string;
}

export interface CableSpec {
  id: "coax" | "ethernet" | "fiber";
  /** Bangla name used on cards. */
  label: string;
  /** Very short Bangla tab label, so it never reads as a media-switch button. */
  tab: string;
  /** English technical name. */
  en: string;
  /** One-line Bangla summary. */
  summary: string;
  /** The signal that rides inside the cable. */
  signal: string;
  /** Photo filename inside `public/media/`. */
  photo: string;
  /** Bangla alt text for the photo. */
  photoAlt: string;
  /** Where this cable is actually used, in a Bangladeshi home/school. */
  whereUsed: string;
  /** The connector that ends the cable. */
  connector: CableConnector;
  /** Filename of the second photo: the connector close up. */
  connectorPhoto: string;
  /** Bangla alt text for the connector photo. */
  connectorPhotoAlt: string;
  /** Cutaway layers, outermost → innermost. */
  layers: { name: string; detail: string; color: string }[];
  /** Quick numbers for the data strip. */
  facts: { label: string; value: string }[];
  /** Typical use in one Bangla line. */
  typicalUse: string;
}

export const CABLES: CableSpec[] = [
  {
    id: "coax",
    label: "কোঅ্যাক্সিয়াল কেবল",
    tab: "কোঅ্যাক্স",
    en: "Coaxial cable",
    summary: "একটাই তামার কোর, তার চারপাশে বেষ্টনী — TV ও কেবল ইন্টারনেটের পুরোনো পথ।",
    signal: "বৈদ্যুতিক (radio-frequency)",
    photo: "coax-cable.jpg",
    photoAlt:
      "কাঠের টেবিলে রাখা একগুচ্ছ সাদা কোঅ্যাক্সিয়াল কেবল; কাটা প্রান্তে শিল্ড ও তামার কোর দেখা যাচ্ছে, কোনো কানেক্টর নেই।",
    whereUsed:
      "টিভি সংযোগের সাদা কেবল, বাসার ছাদে বসানো ডিশ ও পুরোনো কেবল-ইন্টারনেট লাইনে।",
    connector: {
      name: "F কানেক্টর",
      en: "F-type connector",
      note: "স্ক্রু করে টিভি বা সেট-টপ বক্সের সকেটে আটকানো হয়; ভেতরের কোর তারটি সকেটের গর্তে ঢোকে।",
    },
    connectorPhoto: "coax-connector.jpg",
    connectorPhotoAlt:
      "F কানেক্টরের সামনের দিকের ক্লোজ-আপ: ভেতরে তামার কোর তার, চারপাশে ধাতব থ্রেড।",
    layers: [
      { name: "বাইরের জ্যাকেট (PVC)", detail: "কেবলকে ভেজা ও ঘষা থেকে বাঁচায়", color: "#94a3b8" },
      { name: "ব্রেইডেড শিল্ড", detail: "তামার জাল — বাইরের noise আটকায়", color: "#f4ad76" },
      { name: "ডাইইলেকট্রিক (foam)", detail: "কোর ও শিল্ডকে আলাদা রাখে", color: "#e2e8f0" },
      { name: "তামার কোর", detail: "সংকেত এখান দিয়েই চলে", color: "#f97316" },
    ],
    facts: [
      { label: "সংকেত", value: "বৈদ্যুতিক RF" },
      { label: "সাধারণ impedance", value: "৭৫ ohm (TV) / ৫০ ohm (radio)" },
      { label: "কানেক্টর", value: "F-type / BNC" },
    ],
    typicalUse: "কেবল টিভি, CCTV ক্যামেরা, হ্যাম রেডিও",
  },
  {
    id: "ethernet",
    label: "ইথারনেট কেবল",
    tab: "ইথারনেট",
    en: "Ethernet cable (UTP twisted pair)",
    summary: "আটটি প্যাঁচানো তামার তার, এক জোড়ায় পাঠানো আর এক জোড়ায় গ্রহণ।",
    signal: "বৈদ্যুতিক (differential voltage)",
    photo: "ethernet-cable.jpg",
    photoAlt: "একগুচ্ছ ধূসর Ethernet কেবল; কাটা প্রান্তে চার জোড়া রঙিন প্যাঁচানো তার দেখা যাচ্ছে, কোনো RJ-45 প্লাগ নেই।",
    whereUsed: "স্কুল ল্যাবের ডেস্কটপ থেকে সুইচ, বাসার রাউটার থেকে ল্যাপটপ, অফিসের প্যাচ প্যানেল।",
    connector: {
      name: "RJ-45 প্লাগ",
      en: "RJ-45 (8P8C) plug",
      note: "স্বচ্ছ প্লাস্টিকের মাথায় আটটি সোনার পিন থাকে; ক্লিক শব্দে পোর্টে আটকে যায়।",
    },
    connectorPhoto: "ethernet-connector.jpg",
    connectorPhotoAlt: "একটি কম্পিউটারের ল্যান পোর্টে আটকে থাকা স্বচ্ছ RJ-45 প্লাগের ক্লোজ-আপ।",
    layers: [
      { name: "বাইরের জ্যাকেট", detail: "তারগুলোকে একসঙ্গে ধরে রাখে", color: "#94a3b8" },
      { name: "৪ জোড়া প্যাঁচানো তার", detail: "প্যাঁচানো থাকায় noise কম লাগে", color: "#60a5fa" },
      { name: "RJ-45 প্লাগ", detail: "৮টি পিন দিয়ে সকেটে সংযোগ", color: "#e2e8f0" },
    ],
    facts: [
      { label: "সংকেত", value: "বৈদ্যুতিক ভোল্টেজ" },
      { label: "গতি", value: "100 Mbps – 10 Gbps" },
      { label: "কানেক্টর", value: "RJ-45 (8P8C)" },
    ],
    typicalUse: "LAN, সুইচ-রাউটার সংযোগ, PoE ক্যামেরা",
  },
  {
    id: "fiber",
    label: "অপটিক্যাল ফাইবার",
    tab: "ফাইবার",
    en: "Optical fiber cable",
    summary: "কাচের সরু কোরের ভেতর আলোর ঝলক — সবচেয়ে দ্রুত ও দূরগামী মাধ্যম।",
    signal: "আলো (light pulses)",
    photo: "fiber-cable.jpg",
    photoAlt: "একগুচ্ছ কমলা ও হলুদ অপটিক্যাল ফাইবার কেবল; খোলা প্রান্তে সূক্ষ্ম কাচের ফাইবার দেখা যাচ্ছে, কোনো কানেক্টর নেই।",
    whereUsed: "ISP-র মেইন লাইন (FTTH), দেশের backbone, ডাটা সেন্টারের র‍্যাক-থেকে-র‍্যাক সংযোগ।",
    connector: {
      name: "LC / SC কানেক্টর",
      en: "LC / SC connector",
      note: "ভেতরের ফেরুলের ডগা কাচের কোরের সঙ্গে নিখুঁতভাবে মিলিয়ে বসানো হয়; ধুলো লাগলে আলো আটকে যায়।",
    },
    connectorPhoto: "fiber-connector.jpg",
    connectorPhotoAlt: "সাদা LC ও SC ফাইবার কানেক্টরের সামনের দিক — ভেতরে সিরামিক ফেরুল দেখা যাচ্ছে।",
    layers: [
      { name: "বাইরের জ্যাকেট", detail: "কেবলকে যান্ত্রিক টান থেকে বাঁচায়", color: "#94a3b8" },
      { name: "কেভলার / স্ট্রেংথ মেম্বার", detail: "টান সামলায়, ফাইবারে লাগতে দেয় না", color: "#fbbf24" },
      { name: "ক্ল্যাডিং", detail: "আলোকে ভেতরে ফিরিয়ে দেয়", color: "#c4b5fd" },
      { name: "কাচের কোর", detail: "আলো এই কোর দিয়েই দৌড়ায়", color: "#e9d5ff" },
    ],
    facts: [
      { label: "সংকেত", value: "আলো (light)" },
      { label: "গতি", value: "10 – 100 Gbps" },
      { label: "কানেক্টর", value: "LC / SC / ST" },
    ],
    typicalUse: "FTTH ইন্টারনেট, backbone, ডাটা সেন্টার",
  },
];

export function cableById(id: CableSpec["id"]): CableSpec | undefined {
  return CABLES.find((cable) => cable.id === id);
}

/* -------------------------------------------------------------------------- */
/* Wireless media                                                             */
/* -------------------------------------------------------------------------- */

export interface WirelessSpec {
  id: "radio" | "microwave" | "infrared" | "satellite";
  label: string;
  en: string;
  /** Bangla hero sentence. */
  summary: string;
  /** What carries the data — wave type, one Bangla line. */
  wave: string;
  /** Typical frequency band, plain text. */
  band: string;
  /** Typical reach. */
  range: string;
  /** Real use a student can point at. */
  use: string;
  /** What the wave has to pass through, and what that costs. */
  obstacle: string;
  /** Where it is used in this app's own subject matter. */
  starlink: string;
  color: string;
}

export const WIRELESS_MEDIA: WirelessSpec[] = [
  {
    id: "radio",
    label: "রেডিও তরঙ্গ",
    en: "Radio waves",
    summary: "কম ফ্রিকোয়েন্সির তরঙ্গ, যা দেয়াল ভেদ করে ঘরের ভেতরে ডাটা পৌঁছে দেয়।",
    wave: "বেতার তরঙ্গ (RF)",
    band: "2.4 GHz / 5 GHz (Wi-Fi), 900 MHz (LoRa)",
    range: "ঘরের ভেতরে ৩০–৫০ মিটার",
    use: "Wi-Fi, ব্লুটুথ, মোবাইল ডাটা",
    obstacle: "দেয়াল, দূরত্ব ও অন্য নেটওয়ার্কের বাধা",
    starlink: "ডিশ ও রাউটারের মাঝে বেতার লিংক",
    color: "#a78bfa",
  },
  {
    id: "microwave",
    label: "মাইক্রোওয়েভ",
    en: "Microwaves",
    summary: "উচ্চ ফ্রিকোয়েন্সির সংকীর্ণ বিম — দুই টাওয়ারের মধ্যে অনেক দূর পর্যন্ত যায়।",
    wave: "মাইক্রোওয়েভ",
    band: "১১–৪০ GHz (শর্ট-রেঞ্জ লিংক)",
    range: "কয়েক কিলোমিটার, সোজা দৃষ্টির মধ্যে",
    use: "টাওয়ার-থেকে-টাওয়ার লিংক, পুরোনো ISP ব্যাকহল",
    obstacle: "গাছ, পাহাড়, বৃষ্টি — পথ আটকালে সংযোগ কাটে",
    starlink: "গ্রাউন্ড স্টেশন ও ব্যাকহল লিংক",
    color: "#fbbf24",
  },
  {
    id: "infrared",
    label: "ইনফ্রারেড",
    en: "Infrared",
    summary: "আলোর মতোই সোজা চলে, কিন্তু চোখে দেখা যায় না — শুধু সোজা দৃষ্টির মধ্যে।",
    wave: "ইনফ্রারেড আলো",
    band: "৩০ THz – ৪০০ THz",
    range: "কয়েক মিটার, বাধা ছাড়া",
    use: "রিমোট কন্ট্রোল, পুরোনো IrDA ফাইল পাঠানো",
    obstacle: "একটি কাগজও পথ আটকে দিতে পারে",
    starlink: "সরাসরি ব্যবহার নেই (তুলনার জন্য)",
    color: "#f87171",
  },
  {
    id: "satellite",
    label: "স্যাটেলাইট লিংক",
    en: "Satellite link",
    summary: "মহাকাশের স্যাটেলাইটের সঙ্গে রেডিও লিংক — যেখানে কেবল পৌঁছায় না, সেখানেও ইন্টারনেট।",
    wave: "রেডিও / মাইক্রোওয়েভ (Ku, Ka band)",
    band: "১০.৭–৩০ GHz (Ku/Ka band)",
    range: "৫৫০ কিমি (LEO) থেকে ৩৫,৭৮৬ কিমি (GEO)",
    use: "Starlink, VSAT, দুর্যোগে জরুরি যোগাযোগ",
    obstacle: "মেঘ, বৃষ্টি ও দৃষ্টির কোণ",
    starlink: "বাংলাদেশে Starlink ডিশের মূল সংযোগ",
    color: "#3ddbd9",
  },
];

/* -------------------------------------------------------------------------- */
/* The wireless journey, step by step                                         */
/* -------------------------------------------------------------------------- */

export interface WirelessStep {
  title: string;
  /** Bangla explanation of this hop. */
  body: string;
  /** Mono strip: the technical name of this hop. */
  detail: string;
  /** Which hop of the figure lights up. */
  hop: "app" | "nic" | "antenna" | "air" | "peer";
}

/** What happens when the same six bits travel with no wire at all. */
export const WIRELESS_STEPS: WirelessStep[] = [
  {
    title: "অ্যাপ ডাটা তৈরি করল",
    body: "ঠিক আগের মতোই — ব্রাউজার বা অ্যাপ একটি request তৈরি করল। তারের অনুপস্থিতিতে ডাটা তৈরি করার নিয়মের কোনো পরিবর্তন হয় না।",
    detail: "application → data",
    hop: "app",
  },
  {
    title: "NIC ডাটাকে তরঙ্গের ভাষায় বদলাল",
    body: "Wi-Fi অ্যাডাপ্টার বিটগুলোকে মডুলেশন দিয়ে তরঙ্গের পরিবর্তনে বদলে দিল। এখন আর কোনো ভোল্টেজ বা আলো নেই — শুধু বৈদ্যুতিক তরঙ্গ।",
    detail: "bits → modulation → RF signal",
    hop: "nic",
  },
  {
    title: "অ্যান্টেনা তরঙ্গ বাতাসে ছাড়ল",
    body: "অ্যান্টেনা বৈদ্যুতিক সংকেতকে তড়িৎ-চৌম্বকীয় তরঙ্গে বদলে চারপাশে ছড়িয়ে দেয়। তারের বদলে বাতাসই এখন পথ।",
    detail: "antenna → electromagnetic wave",
    hop: "antenna",
  },
  {
    title: "তরঙ্গ বাতাসে চলছে: BPSK, QPSK, 256-QAM",
    body: "তরঙ্গের ফেজ ও বিস্তার বদলে একসঙ্গে একাধিক বিট পাঠানো হয়। ২৫৬-QAM-এ একটি প্রতীকে ৮ বিট — তাই বেশি ডাটা, কিন্তু সংকেত দুর্বল হলে দ্রুত ভেঙে পড়ে।",
    detail: "wave → BPSK / QPSK / 256-QAM",
    hop: "air",
  },
  {
    title: "রিসিভার তরঙ্গ ধরল",
    body: "অন্য প্রান্তের অ্যান্টেনা তরঙ্গ ধরে, অ্যাডাপ্টার সেটি আবার বিটে বদলে দেয়। হপ শেষ — কোনো তার লাগেনি।",
    detail: "wave → demodulation → bits",
    hop: "peer",
  },
];

/* -------------------------------------------------------------------------- */
/* Photo credits                                                              */
/* -------------------------------------------------------------------------- */

export interface PhotoCredit {
  file: string;
  title: string;
  author: string;
  license: string;
  licenseUrl?: string;
  source?: string;
}

/**
 * Photo attributions are shown in the page so source and license information
 * travels with the images. Cable-bundle images are AI-generated illustrations;
 * connector close-ups and the remaining photos retain their source credits.
 */
export const MEDIA_CREDITS: PhotoCredit[] = [
  {
    file: "coax-cable.jpg",
    title: "Coaxial cable bundle (connector-free illustration)",
    author: "AI-generated for this project",
    license: "AI-generated illustration",
  },
  {
    file: "coax-connector.jpg",
    title: "F Connector Side",
    author: "Colin",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    source: "https://commons.wikimedia.org/wiki/File:F_Connector_Side.jpg",
  },
  {
    file: "ethernet-cable.jpg",
    title: "Ethernet cable bundle (connector-free illustration)",
    author: "AI-generated for this project",
    license: "AI-generated illustration",
  },
  {
    file: "ethernet-connector.jpg",
    title: "RJ45 Ethernet Cable",
    author: "Khairil Yusof",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    source: "https://commons.wikimedia.org/wiki/File:RJ45_Ethernet_Cable.jpg",
  },
  {
    file: "fiber-cable.jpg",
    title: "Optical fiber bundle (connector-free illustration)",
    author: "AI-generated for this project",
    license: "AI-generated illustration",
  },
  {
    file: "fiber-connector.jpg",
    title: "Lc-sc-fiber-connectors",
    author: "Wikimedia Commons (see file page)",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    source: "https://commons.wikimedia.org/wiki/File:Lc-sc-fiber-connectors.jpg",
  },
  {
    file: "wireless-router.jpg",
    title: "TP-Link TL-WR841N",
    author: "Raimond Spekking",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    source: "https://commons.wikimedia.org/wiki/File:TP-Link_TL-WR841N-2920.jpg",
  },
  {
    file: "wireless-router-room.jpg",
    title: "TP-Link Wireless N Router WR845N",
    author: "Kskhh",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    source: "https://commons.wikimedia.org/wiki/File:TP-Link_Wireless_N_Router_WR845N.jpg",
  },
];

/** Resolve a `public/media/` file against the deployed base path. */
const base = (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) || "/";
export function mediaAsset(file: string): string {
  return `${base}media/${file}`;
}
