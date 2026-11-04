/**
 * Network topology models for the lab's interactive topology page.
 *
 * Every topology is plain data: device positions, cable links (and, for the
 * bus, one backbone with taps and a terminator at each end). Nothing here
 * touches the DOM, so the routing maths — shortest path, what is still
 * reachable after a cable is cut, whether a second path exists — can be tested
 * on its own and reused by the figure.
 *
 * A bus is deliberately *not* modelled as a chain of graph nodes. On a real
 * bus every station taps the same coaxial cable, a transmission is heard by
 * everyone and only the addressed station keeps it, and a cut end without a
 * terminator reflects the signal back into the segment (echo) and corrupts the
 * whole bus. Modelling it as an ordinary graph would quietly lose all three of
 * those lessons.
 */

export type TopologyId =
  | "bus"
  | "ring"
  | "star"
  | "tree"
  | "full-mesh"
  | "partial-mesh"
  | "hybrid";

export type DeviceKind = "pc" | "switch" | "server";

export interface Point {
  x: number;
  y: number;
}

export interface TopoNode {
  id: string;
  /** Short label drawn under the device, e.g. "PC1" or "Switch A". */
  label: string;
  kind: DeviceKind;
  x: number;
  y: number;
  /** Optional mono caption, e.g. "ROOT" or "CORE". */
  tag?: string;
}

export interface TopoLink {
  id: string;
  a: string;
  b: string;
  /** Data only flows a → b (the ring sends one way). */
  oneWay?: boolean;
  /**
   * Bows the cable sideways by this many SVG units. Long diagonals in a mesh
   * would otherwise all cross at the centre, hiding each other's cut handles.
   */
  bend?: number;
}

export interface BusSegment {
  /** 0 is the left terminator → first tap, then tap → tap, last is → right. */
  index: number;
  fromX: number;
  toX: number;
}

export interface BusSpec {
  /** y of the backbone cable. */
  y: number;
  /** x of the left and right terminator connection points. */
  left: number;
  right: number;
  /** Devices on the cable, in cable order. */
  taps: { nodeId: string; x: number }[];
}

export interface Topology {
  id: TopologyId;
  title: string;
  en: string;
  tagline: string;
  nodes: TopoNode[];
  links: TopoLink[];
  bus?: BusSpec;
}

/* -------------------------------------------------------------------------- */
/* Copy: what each topology is, its trade-offs and where it is really used    */
/* -------------------------------------------------------------------------- */

export interface TopologyMeta {
  id: TopologyId;
  title: string;
  en: string;
  tagline: string;
  /** One short paragraph: how the devices are wired. */
  how: string;
  pros: string[];
  cons: string[];
  uses: string[];
  /** Where students actually meet it, in one line. */
  example: string;
  cost: string;
  reliability: string;
  /** The sentence the figure prints when the topology is chosen. */
  caption: string;
}

export const TOPOLOGY_META: Record<TopologyId, TopologyMeta> = {
  bus: {
    id: "bus",
    title: "বাস",
    en: "Bus",
    tagline: "একটি মূল তার, সবাই তার সঙ্গে যুক্ত",
    how: "একটি মোটা coaxial কেবল পুরো নেটওয়ার্কের মেরুদণ্ড। প্রতিটি কম্পিউটার T-connector দিয়ে সেই একই তারে যুক্ত, আর তারের দুই মাথায় terminator বসানো থাকে। যে কেউ ডাটা পাঠালে সেই সংকেত তার বেয়ে দুই দিকে ছড়িয়ে যায়; সবাই শোনে, কিন্তু ঠিকানা মিললে কেবল একজন গ্রহণ করে।",
    pros: [
      "খুব কম তার আর কম খরচ — একটি মূল তারেই অনেক ডিভাইস",
      "নতুন ডিভাইস যোগ করা সহজ, কেন্দ্রীয় কোনো যন্ত্র লাগে না",
      "ছোট নেটওয়ার্কে সেটআপ দ্রুত",
    ],
    cons: [
      "মূল তার যেকোনো জায়গায় কাটলে বা terminator খুলে গেলে সংকেত প্রতিফলিত (echo) হয়ে পুরো নেটওয়ার্ক অচল",
      "সবাই একই তার ভাগ করে, তাই একসঙ্গে বেশি ডাটা পাঠালে collision হয় ও গতি কমে",
      "একটি তারেই পুরো নেটওয়ার্ক ঝুলে থাকে — কোনো বিকল্প পথ নেই",
      "সমস্যা খুঁজে বের করা কঠিন, কারণ যেকোনো এক জায়গার দোষে সবাই থেমে যায়",
    ],
    uses: [
      "পুরনো 10BASE2 / 10BASE5 ইথারনেট ল্যাব",
      "গাড়ির ভেতরের CAN bus (ইঞ্জিন, ব্রেক, সেন্সর একই তারে)",
      "কারখানার মেশিনের fieldbus (Modbus, PROFIBUS)",
      "কিছু সেন্সর-লাইন ও শিল্প নিয়ন্ত্রণ নেটওয়ার্ক",
    ],
    example: "পুরনো স্কুল ল্যাবের পেছনে একটাই মোটা তার, তাতে সব কম্পিউটার ক্লিপ দিয়ে আটকানো — সেটাই বাস।",
    cost: "সবচেয়ে কম",
    reliability: "দুর্বল (একটি কাট = পুরো নেটওয়ার্ক বন্ধ)",
    caption:
      "সব ডিভাইস একই মূল তারে যুক্ত; দুই মাথায় terminator সংকেত শুষে নেয়, নইলে প্রতিফলিত হয়ে ফিরে আসে। তারের যেকোনো বিন্দুতে ক্লিক করে কেটে দেখো।",
  },
  ring: {
    id: "ring",
    title: "রিং",
    en: "Ring",
    tagline: "প্রতিটি ডিভাইস পরেরটির সঙ্গে, মিলে একটি বৃত্ত",
    how: "প্রতিটি কম্পিউটার ঠিক দুটি প্রতিবেশীর সঙ্গে যুক্ত, আর শেষটি প্রথমটির সঙ্গে — মিলে একটি বৃত্ত। ডাটা নির্দিষ্ট এক দিকে (clockwise) hop করে hop করে ঘুরে গন্তব্যে পৌঁছায়। অনেক রিংয়ে টোকেন নামের একটি বিশেষ ফ্রেম ঘোরে, যার পালা পেলে কেউ পাঠাতে পারে।",
    pros: [
      "সব ডিভাইসের পালা নির্দিষ্ট, তাই collision কম",
      "সমান দূরত্বে সবার ডাটা যায়, পারফরম্যান্স অনুমানযোগ্য",
      "টোকেন পাসিং দিয়ে বড় নেটওয়ার্কেও নিয়ন্ত্রণ রাখা যায়",
      "dual ring (দুই দিকের রিং) ব্যবহার করলে এক জায়গায় কাটা গেলেও নেটওয়ার্ক টিকে থাকে",
    ],
    cons: [
      "একটি ডিভাইস বা তার নষ্ট হলে সাধারণ রিং ভেঙে পুরো নেটওয়ার্ক থেমে যায়",
      "একটি মেসেজকে গোটা বৃত্ত ঘুরতে হয়, তাই hop বেশি",
      "নতুন ডিভাইস যোগ করলে সাময়িকভাবে রিং ভাঙতে হয়",
      "সমস্যা ধরতে হলে পুরো রিং ধরে পরীক্ষা করতে হয়",
    ],
    uses: [
      "পুরনো Token Ring ও FDDI নেটওয়ার্ক",
      "SONET/SDH ও মেট্রো অপটিক্যাল ফাইবার রিং",
      "ডেটা সেন্টারের স্টোরেজ নেটওয়ার্ক, কিছু শিল্প নিয়ন্ত্রণ লুপ",
    ],
    example: "শহরের চারপাশে অপটিক্যাল ফাইবারের একটি বৃত্ত, এক দিক ভাঙলে অন্য দিক দিয়ে ডাটা ঘুরিয়ে পাঠানো হয়।",
    cost: "মাঝারি",
    reliability: "একক রিং দুর্বল, dual ring ভালো",
    caption:
      "ডাটা এক দিকেই ঘোরে। “কার কাছ থেকে কার কাছে” বদলে দেখো পথ কত hop — আর একটি ডিভাইস বন্ধ করে দেখো বৃত্ত কোথায় ভাঙে।",
  },
  star: {
    id: "star",
    title: "স্টার",
    en: "Star",
    tagline: "মাঝখানে একটি switch, চারদিকে ডিভাইস",
    how: "সব কম্পিউটার আলাদা তারে একটি কেন্দ্রীয় switch বা hub-এর সঙ্গে যুক্ত। কোনো ডিভাইস ডাটা পাঠালে সেটি প্রথমে switch-এ যায়, switch সেটি কেবল গন্তব্যের পোর্টে এগিয়ে দেয়। ডিভাইসদের মধ্যে সরাসরি কোনো তার নেই।",
    pros: [
      "একটি ডিভাইস বা তার নষ্ট হলে বাকিরা অক্লান্ত কাজ করে",
      "সমস্যা খুঁজে বের করা সহজ — পোর্টের LED দেখেই বোঝা যায়",
      "switch ব্যবহার করলে প্রতিটি ডিভাইস আলাদা ব্যান্ডউইথ পায়",
      "নতুন ডিভাইস যোগ করলে পুরো নেটওয়ার্ক বন্ধ করতে হয় না",
    ],
    cons: [
      "কেন্দ্রীয় switch নষ্ট হলে পুরো নেটওয়ার্ক অচল — single point of failure",
      "প্রতিটি ডিভাইসের জন্য আলাদা তার লাগে, তাই বেশি কেবল ও পোর্ট",
      "switch-এর পোর্ট সংখ্যা সীমিত, বড় হলে আরও switch দরকার",
      "স্টার বড় হলে মাঝের switch-এ চাপ বাড়ে",
    ],
    uses: [
      "আজকের প্রায় সব অফিস ও বাসার LAN (Wi-Fi router-ও একটি star কেন্দ্র)",
      "স্কুল ও কলেজের কম্পিউটার ল্যাব",
      "একটি সুইচের সঙ্গে যাওয়া প্রিন্টার, ফাইল সার্ভার",
    ],
    example: "তোমার বাসার Wi-Fi router: মোবাইল, ল্যাপটপ, টিভি — সবই তার এক কেন্দ্রে যুক্ত।",
    cost: "মাঝারি",
    reliability: "ভালো (তবে কেন্দ্রটিই ঝুঁকি)",
    caption:
      "সব ডাটা কেন্দ্রীয় switch হয়ে যায়। switch বন্ধ করে দেখো — সব ক্লায়েন্ট একসঙ্গে হারিয়ে যায়।",
  },
  tree: {
    id: "tree",
    title: "ট্রি",
    en: "Tree",
    tagline: "স্টারের স্তর, শাখায় শাখায় সাজানো",
    how: "একাধিক star নেটওয়ার্ককে স্তরে স্তরে জোড়া হলে তাকে tree (hierarchical) topology বলে। উপরে একটি root/core switch, তার নিচে শাখা switch, আর সবচেয়ে নিচে কম্পিউটার। অর্থাৎ এটি একটি গাছের মতো শাখা-প্রশাখায় ভাগ করা star।",
    pros: [
      "বড় নেটওয়ার্ককে ভবন, ফ্লোর বা বিভাগ অনুযায়ী ভাগ করে সাজানো যায়",
      "এক শাখার সমস্যা অন্য শাখায় ছড়ায় না",
      "প্রয়োজন অনুযায়ী নতুন শাখা যোগ করা সহজ, ব্যর্থতা খুঁজতে হয় শাখা ধরে ধরে",
      "বড় অফিস ও ক্যাম্পাস নেটওয়ার্কের স্বাভাবিক গঠন",
    ],
    cons: [
      "root switch নষ্ট হলে গোটা গাছ আলাদা আলাদা দ্বীপে ভেঙে যায়",
      "সব ডাটা একাধিক স্তর পার হয়, তাই hop ও delay বাড়ে",
      "স্তর যত বাড়ে, root-এ চাপ তত বাড়ে — ব্যয়ও বাড়ে",
      "এক স্তরের ব্যাকআপ রাখতে না পারলে সেটাই দুর্বল জায়গা",
    ],
    uses: [
      "ক্যাম্পাস বা কর্পোরেট অফিস নেটওয়ার্ক (core → distribution → access)",
      "একাধিক ফ্লোরের বিল্ডিং নেটওয়ার্ক",
      "ISP-এর গ্রাহক বিতরণ (distribution) নেটওয়ার্ক",
      "কেবল টিভির HFC নেটওয়ার্ক",
    ],
    example: "তোমার কলেজের নেটওয়ার্ক: মূল সুইচ → প্রতিটি ফ্লোরের সুইচ → প্রতিটি ক্লাসরুমের কম্পিউটার।",
    cost: "মাঝারি থেকে বেশি",
    reliability: "শাখা-ভিত্তিক ভালো, root-এ ঝুঁকি",
    caption:
      "স্তরে স্তরে switch: root → শাখা → কম্পিউটার। root বন্ধ করলে সব শাখা আলাদা হয়ে যায়, একটা শাখা বন্ধ করলে অন্যগুলো ঠিক থাকে।",
  },
  "full-mesh": {
    id: "full-mesh",
    title: "ফুল মেশ",
    en: "Full Mesh",
    tagline: "প্রত্যেকে প্রত্যেকের সঙ্গে সরাসরি যুক্ত",
    how: "প্রতিটি ডিভাইস নেটওয়ার্কের বাকি প্রতিটি ডিভাইসের সঙ্গে সরাসরি তার বা লিংকে যুক্ত। n সংখ্যক ডিভাইসে তার লাগে n × (n − 1) / 2 টি — ৫টি ডিভাইসে ১০টি। তাই একটির সঙ্গে অন্যটির পথ সব সময় এক ধাপ।",
    pros: [
      "সবচেয়ে নির্ভরযোগ্য: একটি লিংক বা ডিভাইস নষ্ট হলেও বাকিরা সরাসরি সংযুক্ত থাকে",
      "কোনো hop ছাড়াই ডাটা যায় — delay সবচেয়ে কম, গোপনীয়তাও ভালো",
      "collision ও যানজটের ঝুঁকি কম, কারণ প্রতি জোড়ার নিজস্ব পথ",
    ],
    cons: [
      "তারের সংখ্যা ও খরচ সবচেয়ে বেশি — ডিভাইস বাড়লে দ্রুত বাড়ে",
      "প্রতিটি ডিভাইসে অনেক পোর্ট ও NIC দরকার",
      "ব্যবস্থাপনা ও সমস্যা تشخیص জটিল",
      "ছোট নেটওয়ার্কেও খরচের তুলনায় সুবিধা কম",
    ],
    uses: [
      "ছোট, অত্যন্ত গুরুত্বপূর্ণ ব্যাকবোন বা ক্লাস্টার (৪–৬ নোড)",
      "মিলিটারি ও ব্যাংকের ক্রিটিক্যাল লিংক",
      "ডেটা সেন্টারের কোর (spine) নেটওয়ার্কের কিছু অংশ",
      "উচ্চ-নির্ভরযোগ্য এভিওনিকস বা রাডার নেটওয়ার্ক",
    ],
    example: "৪টি সার্ভারের একটি ছোট ডেটা সেন্টার, যেখানে প্রতিটি সার্ভার বাকি তিনটির সঙ্গে সরাসরি ফাইবারে যুক্ত।",
    cost: "সবচেয়ে বেশি",
    reliability: "সবচেয়ে ভালো",
    caption:
      "৫টি ডিভাইসে ১০টি তার — প্রত্যেকে প্রত্যেকের সঙ্গে সরাসরি। একটি তার কেটে দিলেও বাকি পথ থাকে।",
  },
  "partial-mesh": {
    id: "partial-mesh",
    title: "পার্শিয়াল মেশ",
    en: "Partial Mesh",
    tagline: "কিছু জোড়া সরাসরি, বাকিরা ঘুরে",
    how: "সব জোড়া সরাসরি যুক্ত না করে যেখানে বেশি ট্রাফিক বা বেশি নির্ভরযোগ্যতা দরকার, কেবল সেখানে অতিরিক্ত লিংক রাখা হয়। ফলে কয়েকটি জোড়ার একাধিক পথ থাকে, আবার খরচ পুরো মেশের মতো হয় না। ইন্টারনেট ব্যাকবোন আসলে এভাবেই তৈরি।",
    pros: [
      "ফুল মেশের প্রায় সব নির্ভরযোগ্যতা, কিন্তু অনেক কম তার ও খরচ",
      "গুরুত্বপূর্ণ জোড়ায় বিকল্প পথ রাখা যায়",
      "নেটওয়ার্ক বড় হলেও নিয়ন্ত্রণযোগ্য",
      "একাধিক কাটা বা একটি নোড বন্ধ হলেও অনেক জোড়া টিকে থাকে",
    ],
    cons: [
      "কোন জায়গায় কতটা লিংক দেবে তা ঠিক করা পরিকল্পনার কাজ",
      "কিছু জোড়ার একমাত্র পথ থাকলে সেটাই দুর্বল পয়েন্ট",
      "রাউটিং জটিল — কোন পথে পাঠাবে তা হিসাব করতে হয়",
      "ফুল মেশের মতো সব জোড়ায় কম delay নিশ্চিত নয়",
    ],
    uses: [
      "ইন্টারনেট ব্যাকবোন ও ISP peering",
      "দেশ-দেশের মধ্যে WAN লিংক",
      "বড় কর্পোরেট ও ব্যাংকের ডেটা নেটওয়ার্ক",
      "Starlink-এর লেজার ইন্টার-স্যাটেলাইট লিংক (কাছাকাছি স্যাটেলাইটে সীমিত সংযোগ)",
    ],
    example: "বাংলাদেশের কয়েকটি ISP একে অপরের সঙ্গে কিছু নির্দিষ্ট পথে যুক্ত, সবাই সবার সঙ্গে নয় — সেটাই partial mesh।",
    cost: "মাঝারি",
    reliability: "খুব ভালো (পরিকল্পনাসাপেক্ষ)",
    caption:
      "সব জোড়া নয়, কেবল দরকারি জোড়ায় সরাসরি লিংক। এক তার কাটলে অনেক সময় ঘুরে পথ পাওয়া যায় — প্যানেলের “বিকল্প পথ” দেখো।",
  },
  hybrid: {
    id: "hybrid",
    title: "হাইব্রিড",
    en: "Hybrid",
    tagline: "একাধিক টোপোলজি একসঙ্গে",
    how: "বাস্তব বড় নেটওয়ার্ক কখনো একা এক টোপোলজি হয় না। একটি হাইব্রিড নেটওয়ার্কে একসঙ্গে star (switch কেন্দ্র), ring (একটি লুপ) আর bus বা point-to-point লিংক থাকতে পারে। প্রতিটি অংশ নিজের কাজ অনুযায়ী বেছে নেওয়া হয় — অফিসে star, মেট্রোতে ring, ব্যাকবোনে mesh।",
    pros: [
      "প্রতিটি অংশের জন্য সবচেয়ে উপযুক্ত টোপোলজি বেছে নেওয়া যায়",
      "খরচ ও নির্ভরযোগ্যতার মধ্যে বাস্তবসম্মত ভারসাম্য",
      "এক অংশের সমস্যা অন্য অংশে ছড়ানোর ঝুঁকি কমানো যায়",
      "পুরনো নেটওয়ার্কের সঙ্গে নতুন অংশ জোড়া সহজ",
    ],
    cons: [
      "ডিজাইন, ডকুমেন্টেশন ও ব্যবস্থাপনা জটিল",
      "এক টোপোলজি থেকে অন্য টোপোলজিতে যাওয়ার জায়গাগুলোই (bridge/switch) দুর্বল পয়েন্ট",
      "সমস্যা খুঁজতে হলে বুঝতে হয় কোন অংশে কোন গঠন",
      "প্রশিক্ষণ ও সমস্যা-সমাধানে বেশি দক্ষতা লাগে",
    ],
    uses: [
      "ক্যাম্পাস + ডেটা সেন্টারের বাস্তব কর্পোরেট নেটওয়ার্ক",
      "বাসার Wi-Fi star + ISP-এর tree + ইন্টারনেটের mesh",
      "মেট্রো অপটিক্যাল ring + access star (ISP)",
      "স্যাটেলাইট গ্রাউন্ড স্টেশন নেটওয়ার্ক",
    ],
    example: "তোমার বাসার star নেটওয়ার্ক → ISP-এর tree → ইন্টারনেটের partial mesh — পুরোটাই একটি হাইব্রিড।",
    cost: "প্রয়োজনমতো",
    reliability: "অংশভেদে ভিন্ন",
    caption:
      "বাঁ দিকে star, ডান দিকে ring, মাঝে core switch — একই নেটওয়ার্কে তিন ধরনের গঠন। ডান দিকের বৃত্তে ডাটা এক দিকেই ঘোরে।",
  },
};

/* -------------------------------------------------------------------------- */
/* Geometry                                                                   */
/* -------------------------------------------------------------------------- */

/** Distance from a device centre to where a cable stops, in SVG units. */
export const NODE_RADIUS = 33;

function device(id: string, label: string, x: number, y: number, tag?: string): TopoNode {
  return { id, label, kind: "pc", x, y, tag };
}

function switchNode(id: string, label: string, x: number, y: number, tag?: string): TopoNode {
  return { id, label, kind: "switch", x, y, tag };
}

function link(
  a: string,
  b: string,
  options: { oneWay?: boolean; id?: string; bend?: number } = {},
): TopoLink {
  return { id: options.id ?? `${a}--${b}`, a, b, oneWay: options.oneWay, bend: options.bend };
}

/** Points on an ellipse, clockwise, starting at the top. */
function ellipse(count: number, cx: number, cy: number, rx: number, ry: number): Point[] {
  return Array.from({ length: count }, (_, index) => {
    const t = -Math.PI / 2 + (index * 2 * Math.PI) / count;
    return { x: Math.round(cx + rx * Math.cos(t)), y: Math.round(cy + ry * Math.sin(t)) };
  });
}

const BUS_TAP_X = [190, 320, 450, 580, 700];
const BUS_Y = 236;

function busTopology(): Topology {
  const nodes = BUS_TAP_X.map((x, index) =>
    device(`pc${index + 1}`, `PC${index + 1}`, x, index % 2 === 0 ? 122 : 400),
  );
  return {
    id: "bus",
    title: "বাস",
    en: "Bus",
    tagline: TOPOLOGY_META.bus.tagline,
    nodes,
    links: [],
    bus: {
      y: BUS_Y,
      left: 68,
      right: 806,
      taps: nodes.map((node, index) => ({ nodeId: node.id, x: BUS_TAP_X[index] })),
    },
  };
}

function ringTopology(): Topology {
  const points = ellipse(6, 440, 258, 262, 152);
  const nodes = points.map((point, index) => device(`pc${index + 1}`, `PC${index + 1}`, point.x, point.y));
  const links = nodes.map((node, index) =>
    link(node.id, nodes[(index + 1) % nodes.length].id, { oneWay: true }),
  );
  return {
    id: "ring",
    title: "রিং",
    en: "Ring",
    tagline: TOPOLOGY_META.ring.tagline,
    nodes,
    links,
  };
}

function starTopology(): Topology {
  const points = ellipse(6, 440, 254, 288, 158);
  const nodes = points.map((point, index) => device(`pc${index + 1}`, `PC${index + 1}`, point.x, point.y));
  nodes.push(switchNode("sw", "Switch", 440, 254, "CENTRE"));
  const links = nodes
    .filter((node) => node.id !== "sw")
    .map((node) => link("sw", node.id));
  return {
    id: "star",
    title: "স্টার",
    en: "Star",
    tagline: TOPOLOGY_META.star.tagline,
    nodes,
    links,
  };
}

function treeTopology(): Topology {
  const leaves = [
    { x: 140, y: 352 },
    { x: 250, y: 352 },
    { x: 360, y: 352 },
    { x: 520, y: 352 },
    { x: 630, y: 352 },
    { x: 740, y: 352 },
  ];
  const nodes: TopoNode[] = [
    switchNode("core", "Core", 440, 92, "ROOT"),
    switchNode("sw1", "SW1", 250, 212, "BRANCH"),
    switchNode("sw2", "SW2", 630, 212, "BRANCH"),
    ...leaves.map((point, index) => device(`pc${index + 1}`, `PC${index + 1}`, point.x, point.y)),
  ];
  const links = [
    link("core", "sw1"),
    link("core", "sw2"),
    link("sw1", "pc1"),
    link("sw1", "pc2"),
    link("sw1", "pc3"),
    link("sw2", "pc4"),
    link("sw2", "pc5"),
    link("sw2", "pc6"),
  ];
  return {
    id: "tree",
    title: "ট্রি",
    en: "Tree",
    tagline: TOPOLOGY_META.tree.tagline,
    nodes,
    links,
  };
}

function fullMeshTopology(): Topology {
  const points = ellipse(5, 440, 258, 272, 152);
  const nodes = points.map((point, index) => device(`pc${index + 1}`, `PC${index + 1}`, point.x, point.y));
  const links: TopoLink[] = [];
  for (let a = 0; a < nodes.length; a += 1) {
    for (let b = a + 1; b < nodes.length; b += 1) links.push(link(nodes[a].id, nodes[b].id));
  }
  return {
    id: "full-mesh",
    title: "ফুল মেশ",
    en: "Full Mesh",
    tagline: TOPOLOGY_META["full-mesh"].tagline,
    nodes,
    links,
  };
}

function partialMeshTopology(): Topology {
  const points = ellipse(6, 440, 262, 286, 166);
  const nodes = points.map((point, index) => device(`pc${index + 1}`, `PC${index + 1}`, point.x, point.y));
  const links: TopoLink[] = [];
  // The ring keeps everyone connected; three long chords add redundancy.
  nodes.forEach((node, index) => {
    links.push(link(node.id, nodes[(index + 1) % nodes.length].id, { id: `ring-${index}` }));
  });
  // Straight diameters: the hexagon then reads as a ring with three shortcuts,
  // which is exactly what a partial mesh is.
  links.push(link("pc1", "pc4", { id: "chord-a" }));
  links.push(link("pc2", "pc5", { id: "chord-b" }));
  links.push(link("pc3", "pc6", { id: "chord-c" }));
  return {
    id: "partial-mesh",
    title: "পার্শিয়াল মেশ",
    en: "Partial Mesh",
    tagline: TOPOLOGY_META["partial-mesh"].tagline,
    nodes,
    links,
  };
}

function hybridTopology(): Topology {
  const nodes: TopoNode[] = [
    switchNode("core", "Core", 440, 92, "STAR"),
    switchNode("swL", "SW-L", 226, 202, "LEFT"),
    switchNode("swR", "SW-R", 654, 202, "RIGHT"),
    device("pc1", "PC1", 136, 348),
    device("pc2", "PC2", 226, 348),
    device("pc3", "PC3", 316, 348),
    device("pc4", "PC4", 610, 338),
    device("pc5", "PC5", 726, 414),
    device("pc6", "PC6", 500, 414),
  ];
  const links: TopoLink[] = [
    link("core", "swL"),
    link("core", "swR"),
    link("swL", "pc1"),
    link("swL", "pc2"),
    link("swL", "pc3"),
    link("swR", "pc4"),
    link("pc4", "pc5", { oneWay: true, id: "loop-a" }),
    link("pc5", "pc6", { oneWay: true, id: "loop-b" }),
    link("pc6", "pc4", { oneWay: true, id: "loop-c" }),
  ];
  return {
    id: "hybrid",
    title: "হাইব্রিড",
    en: "Hybrid",
    tagline: TOPOLOGY_META.hybrid.tagline,
    nodes,
    links,
  };
}

export const TOPOLOGIES: Record<TopologyId, Topology> = {
  bus: busTopology(),
  ring: ringTopology(),
  star: starTopology(),
  tree: treeTopology(),
  "full-mesh": fullMeshTopology(),
  "partial-mesh": partialMeshTopology(),
  hybrid: hybridTopology(),
};

/** Same order as the tab strip: simplest first, hybrid last. */
export const TOPOLOGY_ORDER: TopologyId[] = [
  "bus",
  "ring",
  "star",
  "tree",
  "full-mesh",
  "partial-mesh",
  "hybrid",
];

export function topology(id: TopologyId): Topology {
  return TOPOLOGIES[id];
}

export function nodeById(topo: Topology, id: string): TopoNode | undefined {
  return topo.nodes.find((node) => node.id === id);
}

/** Devices that can originate or receive data (a switch only forwards it). */
export function endpoints(topo: Topology): TopoNode[] {
  return topo.nodes.filter((node) => node.kind !== "switch");
}

export function busSegments(bus: BusSpec): BusSegment[] {
  const taps = bus.taps.map((tap) => tap.x);
  const edges = [bus.left, ...taps, bus.right];
  const segments: BusSegment[] = [];
  for (let index = 0; index < edges.length - 1; index += 1) {
    segments.push({ index, fromX: edges[index], toX: edges[index + 1] });
  }
  return segments;
}

/** Stable key for a cable, used as the id of the "cut" state. */
export function busSegmentKey(index: number): string {
  return `bus-seg-${index}`;
}

export function busSegmentLabel(bus: BusSpec, index: number): string {
  const segments = busSegments(bus);
  const segment = segments[index];
  if (!segment) return "তার";
  const leftTap = bus.taps.find((tap) => tap.x === segment.fromX);
  const rightTap = bus.taps.find((tap) => tap.x === segment.toX);
  if (index === 0) return `Terminator → ${leftTap ? labelForTap(leftTap.nodeId) : "PC"}`;
  if (index === segments.length - 1) {
    return `${rightTap ? labelForTap(rightTap.nodeId) : "PC"} → Terminator`;
  }
  const a = leftTap ? labelForTap(leftTap.nodeId) : "";
  const b = rightTap ? labelForTap(rightTap.nodeId) : "";
  return `${a} ↔ ${b}`;
}

function labelForTap(nodeId: string): string {
  const match = /^pc(\d+)$/.exec(nodeId);
  return match ? `PC${match[1]}` : nodeId;
}

/* -------------------------------------------------------------------------- */
/* Routing                                                                    */
/* -------------------------------------------------------------------------- */

/** Links that can carry data, in adjacency order, minus the cut ones. */
export function adjacency(
  topo: Topology,
  cuts: ReadonlySet<string> = new Set(),
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const node of topo.nodes) map.set(node.id, []);
  for (const edge of topo.links) {
    if (cuts.has(edge.id)) continue;
    map.get(edge.a)?.push(edge.b);
    if (!edge.oneWay) map.get(edge.b)?.push(edge.a);
  }
  return map;
}

/** Breadth-first shortest path; null when no route exists. */
export function findRoute(
  topo: Topology,
  from: string,
  to: string,
  removed: ReadonlySet<string> = new Set(),
  cuts: ReadonlySet<string> = new Set(),
): string[] | null {
  if (from === to) return [from];
  if (removed.has(from) || removed.has(to)) return null;
  const graph = adjacency(topo, cuts);
  const previous = new Map<string, string>();
  const seen = new Set<string>([from]);
  const queue: string[] = [from];

  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const next of graph.get(current) ?? []) {
      if (seen.has(next) || removed.has(next)) continue;
      seen.add(next);
      previous.set(next, current);
      if (next === to) {
        const path = [to];
        let cursor = to;
        while (cursor !== from) {
          cursor = previous.get(cursor) as string;
          path.unshift(cursor);
        }
        return path;
      }
      queue.push(next);
    }
  }
  return null;
}

/**
 * Every device the source can still reach, honouring offline devices and cut
 * cables. On a bus any cut or missing terminator takes the whole cable down,
 * because the unterminated ends echo the signal back into the segment.
 */
export function reachableFrom(
  topo: Topology,
  from: string,
  removed: ReadonlySet<string> = new Set(),
  cuts: ReadonlySet<string> = new Set(),
  terminators: { left: boolean; right: boolean } = { left: true, right: true },
): Set<string> {
  if (removed.has(from)) return new Set();

  if (topo.bus) {
    if (!terminators.left || !terminators.right) return new Set([from]);
    if (busSegments(topo.bus).some((segment) => cuts.has(busSegmentKey(segment.index)))) {
      return new Set([from]);
    }
    return new Set(topo.nodes.map((node) => node.id).filter((id) => !removed.has(id)));
  }

  const graph = adjacency(topo, cuts);
  const seen = new Set<string>([from]);
  const queue = [from];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const next of graph.get(current) ?? []) {
      if (seen.has(next) || removed.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
}

/**
 * True when cutting any one cable of the chosen route still leaves a way
 * through — the redundancy question a mesh vs a star really turns on.
 */
export function hasAlternateRoute(
  topo: Topology,
  from: string,
  to: string,
  path: string[],
  removed: ReadonlySet<string> = new Set(),
  cuts: ReadonlySet<string> = new Set(),
): boolean {
  if (topo.bus) {
    // A bus has exactly one shared cable: there is never a second path.
    return false;
  }
  for (let index = 0; index < path.length - 1; index += 1) {
    const a = path[index];
    const b = path[index + 1];
    const used = topo.links.find(
      (edge) => (edge.a === a && edge.b === b) || (edge.a === b && edge.b === a),
    );
    const nextCuts = new Set(cuts);
    if (used) nextCuts.add(used.id);
    if (findRoute(topo, from, to, removed, nextCuts)) return true;
  }
  return false;
}

/** Where a packet can get to on its way to a destination it cannot reach. */
function frontierPath(
  topo: Topology,
  from: string,
  to: string,
  removed: ReadonlySet<string>,
  cuts: ReadonlySet<string>,
): string[] {
  const graph = adjacency(topo, cuts);
  const previous = new Map<string, string>();
  const seen = new Set<string>([from]);
  const queue = [from];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const next of graph.get(current) ?? []) {
      if (seen.has(next) || removed.has(next)) continue;
      seen.add(next);
      previous.set(next, current);
      queue.push(next);
    }
  }
  const target = nodeById(topo, to);
  if (!target) return [from];
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const id of seen) {
    const node = nodeById(topo, id);
    if (!node) continue;
    const distance = Math.hypot(node.x - target.x, node.y - target.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = id;
    }
  }
  if (!best || best === from) return [from];
  const path = [best];
  let cursor = best;
  while (cursor !== from) {
    const parent = previous.get(cursor);
    if (!parent) return [from];
    cursor = parent;
    path.unshift(cursor);
  }
  return path;
}

export interface TerminatorState {
  left: boolean;
  right: boolean;
}

export type SendOutcome =
  | {
      kind: "ok";
      /** Device ids the packet visits, source and destination included. */
      path: string[];
      points: Point[];
      hops: number;
      /** True on a bus: every station hears the frame, one keeps it. */
      broadcast: boolean;
    }
  | {
      kind: "bus-echo";
      points: Point[];
      reason: "cut" | "terminator";
      message: string;
    }
  | {
      kind: "blocked";
      path: string[];
      points: Point[];
      message: string;
    };

/** Straight polyline through the centres of a device route. */
function routePoints(topo: Topology, path: string[]): Point[] {
  return path
    .map((id) => nodeById(topo, id))
    .filter((node): node is TopoNode => Boolean(node))
    .map((node) => ({ x: node.x, y: node.y }));
}

/**
 * Works out what would happen if `from` sent one packet to `to`, without
 * animating anything. The figure uses the returned points to draw the trip.
 */
export function planSend(
  topo: Topology,
  from: string,
  to: string,
  removed: ReadonlySet<string> = new Set(),
  cuts: ReadonlySet<string> = new Set(),
  terminators: TerminatorState = { left: true, right: true },
): SendOutcome {
  const source = nodeById(topo, from);
  const destination = nodeById(topo, to);
  if (!source || !destination) {
    return { kind: "blocked", path: [], points: [], message: "পাঠানোর ডিভাইস খুঁজে পাওয়া যায়নি।" };
  }
  if (from === to) {
    return {
      kind: "blocked",
      path: [from],
      points: [{ x: source.x, y: source.y }],
      message: "একই ডিভাইসে ডাটা পাঠানোর দরকার নেই — উৎস ও গন্তব্য আলাদা বেছে নাও।",
    };
  }
  if (removed.has(from)) {
    return {
      kind: "blocked",
      path: [from],
      points: [{ x: source.x, y: source.y }],
      message: `${source.label} বন্ধ (offline) — সে কোনো ডাটা পাঠাতে পারে না।`,
    };
  }
  if (removed.has(to)) {
    return {
      kind: "blocked",
      path: [from],
      points: [{ x: source.x, y: source.y }],
      message: `${destination.label} বন্ধ (offline) — প্যাকেট গ্রহণ করার কেউ নেই।`,
    };
  }

  if (topo.bus) {
    const bus = topo.bus;
    const sourceTap = bus.taps.find((tap) => tap.nodeId === from);
    const targetTap = bus.taps.find((tap) => tap.nodeId === to);
    const y = bus.y;
    if (!sourceTap || !targetTap) {
      return { kind: "blocked", path: [from], points: [{ x: source.x, y: source.y }], message: "এই ডিভাইস বাসে যুক্ত নয়।" };
    }

    const segments = busSegments(bus);
    const cutSegments = segments.filter((segment) => cuts.has(busSegmentKey(segment.index)));

    if (!terminators.left || !terminators.right) {
      const missing = !terminators.left ? "বাম" : "ডান";
      const endX = !terminators.left ? bus.left : bus.right;
      return {
        kind: "bus-echo",
        reason: "terminator",
        points: [
          { x: source.x, y: source.y },
          { x: sourceTap.x, y },
          { x: targetTap.x, y },
          { x: endX, y },
        ],
        message: `${missing} দিকের terminator নেই। সংকেত তারের প্রান্তে প্রতিফলিত হয়ে ফিরে আসছে (echo) — আসল ডাটার সঙ্গে মিশে পুরো বাসের ডাটা নষ্ট।`,
      };
    }

    if (cutSegments.length > 0) {
      // Segment i runs between tap i-1 and tap i, so crossing from tap `low`
      // to tap `high` uses segments low + 1 … high.
      const sourceIndex = indexOfTap(bus, from);
      const targetIndex = indexOfTap(bus, to);
      const low = Math.min(sourceIndex, targetIndex);
      const high = Math.max(sourceIndex, targetIndex);
      const onPath = cutSegments.find(
        (segment) => segment.index > low && segment.index <= high,
      );
      const segment = onPath ?? cutSegments[0];
      const cutX = (segment.fromX + segment.toX) / 2;
      return {
        kind: "bus-echo",
        reason: "cut",
        points: [
          { x: source.x, y: source.y },
          { x: sourceTap.x, y },
          { x: cutX, y },
        ],
        message: onPath
          ? "মূল তার কাটা — কাটা প্রান্তে terminator নেই, তাই সংকেত প্রতিফলিত হয়ে echo তৈরি করছে। পুরো বাসের ডাটা নষ্ট।"
          : "তারটির অন্য একটি সেগমেন্ট কাটা। কাটা প্রান্ত থেকে প্রতিফলিত সংকেত পুরো বাসে ছড়িয়ে পড়ে, তাই এখানেও ডাটা যায় না।",
      };
    }

    return {
      kind: "ok",
      path: [from, to],
      points: [
        { x: source.x, y: source.y },
        { x: sourceTap.x, y },
        { x: targetTap.x, y },
        { x: destination.x, y: destination.y },
      ],
      hops: 1,
      broadcast: true,
    };
  }

  const path = findRoute(topo, from, to, removed, cuts);
  if (!path) {
    const frontier = frontierPath(topo, from, to, removed, cuts);
    return {
      kind: "blocked",
      path: frontier,
      points: routePoints(topo, frontier),
      message: `${source.label} → ${destination.label} কোনো সচল পথ নেই। হয় কোনো ডিভাইস বন্ধ, নয়তো কোনো তার কাটা — প্যানেলে “বিকল্প পথ” দেখো।`,
    };
  }

  return {
    kind: "ok",
    path,
    points: routePoints(topo, path),
    hops: path.length - 1,
    broadcast: false,
  };
}

function indexOfTap(bus: BusSpec, nodeId: string): number {
  return bus.taps.findIndex((tap) => tap.nodeId === nodeId);
}

/* -------------------------------------------------------------------------- */
/* Small geometry helpers shared by the figure                                */
/* -------------------------------------------------------------------------- */

/** Point along a polyline, `t` between 0 and 1, measured by length. */
export function pointAlong(points: Point[], t: number): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];
  const lengths: number[] = [];
  let total = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const length = Math.hypot(
      points[index + 1].x - points[index].x,
      points[index + 1].y - points[index].y,
    );
    lengths.push(length);
    total += length;
  }
  if (total === 0) return points[0];
  let remaining = Math.min(Math.max(t, 0), 1) * total;
  for (let index = 0; index < lengths.length; index += 1) {
    if (remaining <= lengths[index] || index === lengths.length - 1) {
      const ratio = lengths[index] === 0 ? 0 : remaining / lengths[index];
      return {
        x: points[index].x + (points[index + 1].x - points[index].x) * ratio,
        y: points[index].y + (points[index + 1].y - points[index].y) * ratio,
      };
    }
    remaining -= lengths[index];
  }
  return points[points.length - 1];
}

/** A point `distance` away from `a` towards `b`, used to stop at a device. */
export function towards(a: Point, b: Point, distance: number): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: a.x + (dx / length) * distance, y: a.y + (dy / length) * distance };
}

/* -------------------------------------------------------------------------- */
/* Facts for the comparison table                                            */
/* -------------------------------------------------------------------------- */

export interface TopologyFacts {
  devices: number;
  /** Cables in the drawing; a bus counts as its single shared cable. */
  links: number;
  /** Longest shortest path between two computers, in hops. */
  maxHops: number;
}

/**
 * The numbers a student can compare across shapes. Hops are measured on the
 * same BFS the simulation uses, so the table and the figure never disagree.
 */
export function topologyFacts(topo: Topology): TopologyFacts {
  const devices = endpoints(topo);
  if (topo.bus) {
    return {
      devices: devices.length,
      links: 1,
      maxHops: devices.length > 1 ? 1 : 0,
    };
  }
  let maxHops = 0;
  for (const from of devices) {
    for (const to of devices) {
      if (from.id === to.id) continue;
      const path = findRoute(topo, from.id, to.id);
      if (path && path.length - 1 > maxHops) maxHops = path.length - 1;
    }
  }
  return { devices: devices.length, links: topo.links.length, maxHops };
}
