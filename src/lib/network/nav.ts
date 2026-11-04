/**
 * The Computer Network learning lab: its pages, in the order a student should
 * read them. Kept in `lib` (next to `content.ts`) because both the site shell
 * and the lab's own components need the same list, and importing it from the
 * component folder would pull the interactive diagrams into the site header.
 */

export interface NetworkPage {
  id: string;
  /** Hash-router path, e.g. `/network/media`. */
  path: string;
  /** Order shown in the lab navigation. */
  num: string;
  /** Bangla title used as the page <h1>. */
  title: string;
  /** English companion term shown next to the Bangla title. */
  en: string;
  /** One-line Bangla summary for cards and menus. */
  blurb: string;
}

export const NETWORK_PAGES: NetworkPage[] = [
  {
    id: "home",
    path: "/network",
    num: "00",
    title: "কম্পিউটার নেটওয়ার্ক ল্যাব",
    en: "Interactive Visual Learning Lab",
    blurb:
      "নেটওয়ার্ক কী, কেন দরকার এবং কোন কোন অংশ মিলে একটি নেটওয়ার্ক তৈরি হয় — ছোট ছোট সিমুলেশন দিয়ে শুরু।",
  },
  {
    id: "playground",
    path: "/network/playground",
    num: "01",
    title: "ইন্টারঅ্যাক্টিভ নেটওয়ার্ক প্লেগ্রাউন্ড",
    en: "Interactive Network Playground",
    blurb:
      "সার্ভার, ক্লায়েন্ট, সুইচ, NIC, কেবল ও Wi-Fi নিয়ে একটি ছোট নেটওয়ার্ক — ক্লিক করে প্রতিটি অংশের কাজ দেখো, প্যাকেট পাঠাও।",
  },
  {
    id: "server-client",
    path: "/network/server-client",
    num: "02",
    title: "সার্ভার ও ক্লায়েন্ট",
    en: "Server and Client Simulation",
    blurb:
      "ল্যাপটপ ও ডেস্কটপ ক্লায়েন্ট থেকে র‍্যাক সার্ভারে request পাঠাও — কিউ, latency, প্রসেসিং আর timeout লাইভ সিমুলেশনে দেখো।",
  },
  {
    id: "media",
    path: "/network/media",
    num: "03",
    title: "নেটওয়ার্ক মিডিয়া",
    en: "Network Media Visualization",
    blurb:
      "Twisted-pair কেবল, অপটিক্যাল ফাইবার আর Wi-Fi — ডাটা কোন মাধ্যমে কীভাবে চলে, পাশাপাশি দেখো।",
  },
  {
    id: "nic",
    path: "/network/nic",
    num: "04",
    title: "নেটওয়ার্ক ইন্টারফেস কার্ড (NIC)",
    en: "Network Interface Card",
    blurb:
      "কম্পিউটারের ভেতরে NIC কোথায় থাকে, সফটওয়্যারের ডাটা কীভাবে নেটওয়ার্কে বের হয় — ধাপে ধাপে।",
  },
  {
    id: "resources",
    path: "/network/resources",
    num: "05",
    title: "নেটওয়ার্ক রিসোর্স",
    en: "Resources Visualization",
    blurb:
      "শেয়ার্ড প্রিন্টার, শেয়ার্ড ফাইল ও ইমেইল সার্ভিস — রিসোর্স শুধু হার্ডওয়্যার নয়, সেটাও দেখো।",
  },
  {
    id: "user",
    path: "/network/user",
    num: "06",
    title: "ইউজার, ক্লায়েন্ট ও সার্ভার",
    en: "User Visualization",
    blurb:
      "মানুষ → ব্রাউজার → ক্লায়েন্ট ডিভাইস → নেটওয়ার্ক → সার্ভার → response — পুরো চেইনে ক্লিক করো।",
  },
  {
    id: "protocol",
    path: "/network/protocol",
    num: "07",
    title: "প্রোটোকল",
    en: "Protocol Visualization",
    blurb:
      "HTTP request-response অ্যানিমেশন, সরল message inspector এবং নিয়ম না মানলে কী হয় তার সিমুলেশন।",
  },
  {
    id: "learn",
    path: "/network/learn",
    num: "08",
    title: "ধাপে ধাপে শেখা",
    en: "Guided Learning Mode",
    blurb:
      "সাত ধাপের গাইডেড কোর্স: প্রতিটি ধাপে ব্যাখ্যা, ডায়াগ্রাম, বাস্তব উদাহরণ আর ছোট প্রশ্ন।",
  },
  {
    id: "challenge",
    path: "/network/challenge",
    num: "09",
    title: "চ্যালেঞ্জ মোড",
    en: "Challenge Mode",
    blurb:
      "ফাইল ডাউনলোডের পুরো পথ সঠিক ক্রমে সাজাও, আর সার্ভার বন্ধ বা কেবল খোলা থাকলে কী হয় তা যাচাই করো।",
  },
];

/** The lab's topic pages, excluding the lab home and the two modes. */
export const NETWORK_LESSONS: NetworkPage[] = NETWORK_PAGES.filter(
  (page) => page.id !== "home" && page.id !== "learn" && page.id !== "challenge",
);

/** Guided-mode reading order (the seven steps named in the brief). */
export const GUIDED_ORDER = [
  "server-client",
  "media",
  "nic",
  "resources",
  "user",
  "protocol",
  "playground",
] as const;

export function findNetworkPage(id: string): NetworkPage | undefined {
  return NETWORK_PAGES.find((page) => page.id === id);
}

/** Same lookup, but the page ids in the pages are literals and must exist. */
export function networkPage(id: string): NetworkPage {
  const found = NETWORK_PAGES.find((page) => page.id === id);
  if (!found) throw new Error(`Unknown network lab page: ${id}`);
  return found;
}

/** Previous/next lesson links for the footer of every lab page. */
export function networkNeighbours(path: string): { prev?: NetworkPage; next?: NetworkPage } {
  const index = NETWORK_PAGES.findIndex((page) => page.path === path);
  if (index === -1) return {};
  return {
    prev: index > 0 ? NETWORK_PAGES[index - 1] : undefined,
    next: index < NETWORK_PAGES.length - 1 ? NETWORK_PAGES[index + 1] : undefined,
  };
}
