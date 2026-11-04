import { useState } from "react";
import {
  AudioWaveform,
  Binary,
  Camera,
  CircuitBoard,
  Cpu,
  Database,
  ExternalLink,
  Home,
  Laptop,
  Monitor,
  Network,
  Radio,
  Router as RouterIcon,
  Smartphone,
  TableProperties,
  Workflow,
} from "lucide-react";
import { mediaAsset } from "@/lib/network/media";
import { cn } from "@/utils/cn";
import { HubSimulation, SwitchSimulation } from "./LanDeviceSim";
import { RouterSimulation } from "./RouterSim";
import { ModemSimulation } from "./ModemSim";
import { Callout, ChoiceGroup, Definition } from "./ui/primitives";

interface DevicePhoto {
  src: string;
  alt: string;
  title: string;
  en: string;
  caption: string;
  body: string;
  points: string[];
  source: string;
  credit: string;
  fit?: "cover" | "contain";
  aspect?: string;
}

function PhotoCard({ photo, className }: { photo: DevicePhoto; className?: string }) {
  return (
    <article className={cn("net-photo-card", className)}>
      <figure className="relative overflow-hidden bg-[#dfe5ee]">
        <img
          src={mediaAsset(photo.src)}
          alt={photo.alt}
          width={960}
          height={720}
          loading="lazy"
          decoding="async"
          className={cn("w-full", photo.fit === "contain" ? "object-contain" : "object-cover")}
          style={{ aspectRatio: photo.aspect ?? "4 / 3" }}
        />
        <span className="net-photo-tag">
          <Camera size={11} /> বাস্তব ছবি
        </span>
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#04060d]/92 via-[#04060d]/55 to-transparent px-3.5 pb-3 pt-9">
          <span className="bangla block text-[11px] font-medium leading-snug text-white">{photo.caption}</span>
        </figcaption>
      </figure>
      <div className="flex flex-1 flex-col p-4 md:p-5">
        <p className="font-mono text-[8.5px] uppercase tracking-[0.15em] text-signal">{photo.en}</p>
        <h3 className="bangla mt-1.5 text-[16px] font-semibold leading-snug text-white">{photo.title}</h3>
        <p className="bangla mt-2 text-[12.5px] leading-relaxed text-muted">{photo.body}</p>
        <ul className="mt-3 space-y-1.5 border-t border-white/[0.07] pt-3">
          {photo.points.map((point) => (
            <li key={point} className="bangla flex gap-2 text-[11.5px] leading-relaxed text-faint">
              <span className="mt-[0.65em] h-1 w-1 shrink-0 rounded-full bg-signal" />
              {point}
            </li>
          ))}
        </ul>
        <a
          href={photo.source}
          target="_blank"
          rel="noreferrer noopener"
          className="bangla mt-auto inline-flex items-center gap-1.5 pt-3 text-[10px] text-faint hover:text-signal"
        >
          {photo.credit} <ExternalLink size={11} />
        </a>
      </div>
    </article>
  );
}

const HUB_PHOTO: DevicePhoto = {
  src: "hub-real.jpg",
  alt: "একটি বাস্তব সাদা Edimax Ethernet hub-এর পেছন দিক; ছয়টি RJ-45 port, uplink port ও power socket দেখা যাচ্ছে",
  title: "বাস্তব Ethernet Hub",
  en: "REAL HUB · EDIMAX",
  caption: "Hub-এর পেছনের RJ-45 port গুলো—দেখতে switch-এর মতোই, কাজ একেবারেই আলাদা",
  body: "ছবির যন্ত্রটি একটি পুরোনো ছোট Ethernet hub। প্রতিটি কম্পিউটারের কেবল একটি করে port-এ ঢোকে। বাইরে থেকে switch-এর সঙ্গে প্রায় হুবহু মিল থাকলেও ভেতরে hub-এর কোনো MAC শেখার বুদ্ধি নেই।",
  points: ["প্রতিটি RJ-45 socket একটি করে ডিভাইসের কেবল নেয়", "Uplink port দিয়ে আরেকটি hub/switch-এর দিকে যাওয়া যায়", "Port অনেক হলেও ভেতরে সবাই একই shared electrical path ব্যবহার করে"],
  source: "https://commons.wikimedia.org/wiki/File:Edimax_Ethernet_Hub-backend.jpg",
  credit: "George Shuklin / Public domain · Wikimedia Commons",
};

const SWITCH_PHOTO: DevicePhoto = {
  src: "switch-real.jpg",
  alt: "খোলা অবস্থায় একটি বাস্তব ZyXEL desktop Ethernet switch; সামনের port, switching চিপ, capacitor ও circuit board দেখা যাচ্ছে",
  title: "বাস্তব Ethernet Switch",
  en: "REAL SWITCH · ZYXEL ES-105A",
  caption: "খোলা switch-এর ভেতরে port module ও switching চিপ—CAM table এই চিপ/মেমোরিতেই থাকে",
  body: "এটি একটি ৫-port desktop switch, কেস খোলা অবস্থায়। বড় switching চিপ frame-এর header পড়ে, Source MAC শেখে এবং CAM নামের দ্রুত hardware memory-তে MAC → port সম্পর্ক সংরক্ষণ করে।",
  points: ["RJ-45 port module গুলো পেছনের দিকে সারিবদ্ধ", "Switching চিপ MAC table lookup করে কোন port-এ frame যাবে তা ঠিক করে", "Link/Act LED কোন port সক্রিয় তা দেখায়"],
  source: "https://commons.wikimedia.org/wiki/File:ZyXEL_desktop_Ethernet_switch.jpg",
  credit: "Malcolm Koo / CC BY 4.0 · Wikimedia Commons",
};

const ROUTER_PHOTOS: DevicePhoto[] = [
  {
    src: "wireless-router.jpg",
    alt: "বাসায় ব্যবহৃত একটি বাস্তব TP-Link wireless router; দুটি antenna ও সামনের indicator light দেখা যাচ্ছে",
    title: "বাসার Wi-Fi Router / Gateway",
    en: "HOME ROUTER",
    caption: "বাসার পরিচিত router—এক বাক্সে প্রায়ই router, ছোট switch ও Wi-Fi access point থাকে",
    body: "বাসার router তোমার LAN (192.168.x.x) আর ISP-এর WAN-এর মাঝে সীমানা। সে default gateway হিসেবে বাইরের packet নেয়, NAT করে এবং ISP-এর দিকে next hop-এ পাঠায়।",
    points: ["LAN port ও Wi-Fi একই ভেতরের নেটওয়ার্কে থাকে", "WAN/Internet port ISP-এর দিকে যায়", "অনেক মডেলে DSL/cable modem অংশও একই বাক্সে থাকে"],
    source: "https://commons.wikimedia.org/wiki/File:TP-Link_TL-WR841N-2920.jpg",
    credit: "Raimond Spekking / CC BY-SA 4.0 · Wikimedia Commons",
    fit: "contain",
  },
  {
    src: "router-home-real.jpg",
    alt: "দুটি লম্বা antenna সহ একটি বাস্তব Linksys WRT54G wireless broadband router-এর সামনের ও ওপরের দিক",
    title: "ছোট অফিসের Wireless Router",
    en: "SMALL OFFICE ROUTER",
    caption: "Linksys WRT54G—antenna শুধু Wi-Fi-এর জন্য; routing-এর সিদ্ধান্ত নেয় ভেতরের processor ও table",
    body: "Antenna দেখে মনে হতে পারে router মানেই Wi-Fi যন্ত্র। আসলে Wi-Fi radio আলাদা অংশ; router-এর মূল কাজ IP packet-এর destination দেখে সঠিক interface/next hop বেছে নেওয়া।",
    points: ["Antenna wireless LAN-এর signal পাঠায় ও নেয়", "ভেতরের CPU routing, NAT, DHCP ও firewall চালাতে পারে", "Ethernet port দিয়ে wired ডিভাইসও একই LAN-এ যুক্ত হয়"],
    source: "https://commons.wikimedia.org/wiki/File:WRT54G_Linksys_Router_with_7_dBi_Antennas_Digon3.jpg",
    credit: "Jonathan Zander / CC BY-SA 3.0 · Wikimedia Commons",
    fit: "contain",
  },
  {
    src: "router-core-real.jpg",
    alt: "ISP বা বড় নেটওয়ার্কে ব্যবহৃত বিশাল Cisco ASR 9912 core router chassis; অনেক line card ও route processor module দেখা যাচ্ছে",
    title: "ISP/Core Router",
    en: "CORE ROUTER · CISCO ASR 9912",
    caption: "Internet backbone-এর core router—বাসার router-এর মতোই next hop ঠিক করে, কিন্তু বিশাল গতিতে",
    body: "এই ধরনের chassis router ISP ও বড় backbone-এ থাকে। একাধিক line card-এ অসংখ্য fiber interface, route processor-এ BGP/OSPF এবং forwarding hardware-এ লক্ষ লক্ষ route থাকতে পারে।",
    points: ["প্রতিটি line card অনেকগুলো উচ্চগতির interface সামলায়", "Route processor routing protocol চালিয়ে table তৈরি করে", "Forwarding অংশ প্রতি সেকেন্ডে বিপুল সংখ্যক packet next hop-এ পাঠায়"],
    source: "https://commons.wikimedia.org/wiki/File:Cisco-ASR-9912_Router.jpg",
    credit: "Saul0fTarsus / CC BY-SA 4.0 · Wikimedia Commons",
    fit: "contain",
    aspect: "4 / 3",
  },
];

export function HubStudy() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <PhotoCard photo={HUB_PHOTO} />
        <div className="space-y-4">
          <Definition
            term="Hub"
            en="Hub · Layer 1 repeater"
            body="Hub এমন একটি কেন্দ্রীয় যন্ত্র, যা এক port দিয়ে আসা electrical signal-কে বাকি সব port-এ হুবহু repeat করে। সে frame-এর ভেতরের MAC address পড়ে না।"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { title: "কোনো স্মৃতি নেই", body: "কোন MAC কোন port-এ আছে—এমন কোনো table Hub রাখে না।" },
              { title: "সবাই শোনে", body: "Source বাদে প্রতিটি ডিভাইস frame-এর একটি করে কপি পায়।" },
              { title: "NIC সিদ্ধান্ত নেয়", body: "Destination MAC মিললে গ্রহণ, না মিললে নিজের NIC-ই frame ফেলে দেয়।" },
            ].map((item) => (
              <article key={item.title} className="panel p-4">
                <h3 className="bangla text-[13px] font-semibold text-white">{item.title}</h3>
                <p className="bangla mt-1.5 text-[11.5px] leading-relaxed text-muted">{item.body}</p>
              </article>
            ))}
          </div>
          <Callout tone="amber" title="সহজ উপমা: ক্লাসরুমে চিৎকার করে খবর দেওয়া">
            <p>
              Hub যেন একজন মানুষ, যে কারো বলা কথা পুরো রুমে চিৎকার করে শুনিয়ে দেয়। যার নাম ধরে বলা হয়েছে
              শুধু সে উত্তর দেয়; বাকিরা শুনলেও উপেক্ষা করে। দুজন একসঙ্গে চিৎকার করলে কথাবার্তা গুলিয়ে যায়—
              নেটওয়ার্কে এটাই collision-এর ঝুঁকি।
            </p>
          </Callout>
        </div>
      </div>
      <HubSimulation />
    </div>
  );
}

const SWITCH_STEPS = [
  { icon: Database, title: "১ · Learn", body: "Frame এলে Source MAC দেখে CAM table-এ লেখে: এই MAC এই port দিয়ে এসেছে।" },
  { icon: TableProperties, title: "২ · Lookup", body: "Destination MAC CAM table-এ খোঁজে। পেলে সংশ্লিষ্ট port জানা যায়।" },
  { icon: Workflow, title: "৩ · Forward / Filter", body: "জানা গন্তব্যে শুধু ওই একটি port-এ পাঠায়; বাকি port-এ পাঠানো থেকে বিরত থাকে।" },
  { icon: Network, title: "৪ · Flood + Aging", body: "অজানা গন্তব্যে সাময়িক flood করে। অনেকদিন নীরব MAC entry aging হয়ে মুছে যায়।" },
];

export function SwitchStudy() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <PhotoCard photo={SWITCH_PHOTO} />
        <div className="space-y-4">
          <Definition
            term="Switch"
            en="Switch · Layer 2 · CAM table"
            body="Switch Ethernet frame-এর Source ও Destination MAC পড়তে পারে। সে শিখে রাখে কোন MAC কোন port-এ আছে, তারপর frame শুধু দরকারি port-এ পাঠায়।"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {SWITCH_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <article key={step.title} className="panel p-4">
                  <Icon size={18} className="text-signal" />
                  <h3 className="bangla mt-2.5 text-[13px] font-semibold text-white">{step.title}</h3>
                  <p className="bangla mt-1.5 text-[11.5px] leading-relaxed text-muted">{step.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      <SwitchSimulation />

      <section className="net-figure" aria-label="Hub ও Switch-এর পার্থক্য">
        <table className="w-full min-w-[680px] border-collapse text-left">
          <caption className="bangla border-b border-white/[0.07] px-4 py-3 text-left text-[12px] text-faint">
            Hub বনাম Switch—একই ১০টি ডিভাইস, সম্পূর্ণ আলাদা আচরণ
          </caption>
          <thead>
            <tr className="text-faint">
              <th className="bangla px-4 py-2.5 text-[11px] font-normal">বিষয়</th>
              <th className="bangla px-4 py-2.5 text-[11px] font-normal">Hub</th>
              <th className="bangla px-4 py-2.5 text-[11px] font-normal">Switch</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["OSI layer", "Layer 1 — শুধু signal repeat", "Layer 2 — Ethernet frame ও MAC বোঝে"],
              ["MAC table", "নেই", "CAM table: MAC → port সংরক্ষণ করে"],
              ["একটি frame কোথায় যায়", "Source বাদে সব port-এ", "জানা গন্তব্যে শুধু একটি port-এ; অজানা হলে flood"],
              ["Bandwidth", "সবাই একই shared পথ ভাগ করে", "আলাদা আলাদা port-এ একসঙ্গে আলাদা frame যেতে পারে"],
              ["Collision domain", "পুরো hub একটি", "প্রতিটি port আলাদা"],
              ["বর্তমান ব্যবহার", "প্রায় বিলুপ্ত, শিক্ষা/বিশেষ কাজে", "আধুনিক LAN-এর স্বাভাবিক কেন্দ্র"],
            ].map(([topic, hub, sw]) => (
              <tr key={topic} className="border-t border-white/[0.06]">
                <th scope="row" className="bangla px-4 py-2.5 text-[11.5px] font-normal text-faint">{topic}</th>
                <td className="bangla px-4 py-2.5 text-[12px] text-muted">{hub}</td>
                <td className="bangla px-4 py-2.5 text-[12px] text-ink">{sw}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

const ROUTER_ACTIONS = [
  { title: "১ · Destination IP পড়ে", body: "আসা frame খুলে ভেতরের IP packet-এর গন্তব্য ঠিকানা দেখে।" },
  { title: "২ · Longest prefix match", body: "Routing table-এ যে network সবচেয়ে নির্দিষ্টভাবে মেলে, সেই row বেছে নেয়।" },
  { title: "৩ · TTL কমায়", body: "Packet চিরদিন ঘুরতে না পারে তাই TTL এক কমায়; শূন্য হলে drop করে।" },
  { title: "৪ · নতুন frame-এ next hop", body: "পরের লিংকের উপযোগী নতুন Layer-2 frame বানিয়ে নির্বাচিত interface দিয়ে পাঠায়।" },
];

export function RouterStudy() {
  return (
    <div className="space-y-5">
      <Definition
        term="Router"
        en="Router · Layer 3 · IP forwarding"
        body="Router এক নেটওয়ার্ক থেকে অন্য নেটওয়ার্কে IP packet পাঠায়। প্রতিটি router নিজের routing table দেখে শুধু পরের hop ঠিক করে; হাজার হাজার router এভাবে একটার পর একটা সিদ্ধান্ত নিয়ে packet গন্তব্যে পৌঁছে দেয়।"
      />
      <div className="grid gap-4 md:grid-cols-3">
        {ROUTER_PHOTOS.map((photo) => (
          <PhotoCard key={photo.src} photo={photo} />
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ROUTER_ACTIONS.map((action) => (
          <article key={action.title} className="panel panel-hover p-4">
            <RouterIcon size={18} className="text-signal" />
            <h3 className="bangla mt-2.5 text-[13px] font-semibold text-white">{action.title}</h3>
            <p className="bangla mt-1.5 text-[11.5px] leading-relaxed text-muted">{action.body}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Callout tone="cyan" title="OSPF / IS-IS — একটি নেটওয়ার্কের ভেতরে">
          <p>Router গুলো নিজেদের লিংকের অবস্থা একে অপরকে জানায়। সবাই একই মানচিত্র পেয়ে Dijkstra দিয়ে সবচেয়ে কম খরচের পথ হিসাব করে routing table বানায়।</p>
        </Callout>
        <Callout tone="violet" title="BGP — ISP থেকে ISP">
          <p>Internet অনেক Autonomous System (AS)-এর জোড়া। BGP এক AS থেকে অন্য AS-এ কোন network কোথায় তা জানায়; এখানে শুধু দূরত্ব নয়, ব্যবসায়িক চুক্তি ও policy-ও পথ ঠিক করে।</p>
        </Callout>
        <Callout tone="amber" title="কেউ পুরো যাত্রা একা জানে না">
          <p>তোমার বাসার router শুধু ISP-কে চেনে; ISP router তার পরের hop চেনে। এভাবে স্থানীয় সিদ্ধান্ত জুড়ে জুড়েই বৈশ্বিক পথ তৈরি হয়।</p>
        </Callout>
      </div>

      <RouterSimulation />
    </div>
  );
}

const MODEM_PHOTOS: DevicePhoto[] = [
  {
    src: "modem-dialup-real.jpg",
    alt: "টেবিলে রাখা একটি বাস্তব কালো US Robotics 56K external dial-up fax modem; সামনের indicator light গুলো দেখা যাচ্ছে",
    title: "External Dial-up Modem",
    en: "STANDALONE MODEM",
    caption: "পুরোনো 56K modem—কম্পিউটারের বাইরে আলাদা বাক্স",
    body: "টেলিফোন লাইনের জন্য তৈরি এই modem কম্পিউটারের serial port থেকে digital data নিয়ে voice-band analog signal বানাত, আবার আসা শব্দ-সংকেত থেকে bit ফিরিয়ে আনত।",
    points: ["LINE port টেলিফোন লাইনে যায়", "সামনের LED carrier, send ও receive অবস্থা দেখায়", "Dial করার সময় handshake শব্দ শোনা যেত"],
    source: "https://commons.wikimedia.org/wiki/File:US_Robotics_56K_Modem_Front.JPG",
    credit: "Xiaowei / CC BY 3.0 · Wikimedia Commons",
  },
  {
    src: "modem-vdsl-real.jpg",
    alt: "চালু অবস্থায় একটি বাস্তব সাদা BT Openreach VDSL modem; DSL ও হলুদ Ethernet কেবল যুক্ত এবং সবুজ light জ্বলছে",
    title: "Broadband VDSL Modem",
    en: "DSL MODEM · CONNECTED",
    caption: "DSL লাইন থেকে আসা signal-কে Ethernet-এ বদলে router-এর কাছে দিচ্ছে",
    body: "এটি একটি VDSL modem। একদিকে টেলিফোন তামার লাইনে DSL-এর বহু carrier, অন্যদিকে সাধারণ Ethernet। Modem অংশটি DSL signal demodulate করে router-এর বোঝার মতো frame দেয়।",
    points: ["DSL port-এ ISP-এর তামার লাইন", "LAN port দিয়ে data router/PC-তে যায়", "DSL light মানে দুই প্রান্তের modem synchronize হয়েছে"],
    source: "https://commons.wikimedia.org/wiki/File:BT%27s_VDSL_modem.jpg",
    credit: "secretlondon123 / CC BY-SA 2.0 · Wikimedia Commons",
  },
  {
    src: "modem-usb-real.jpg",
    alt: "কাঠের টেবিলে রাখা একটি বাস্তব সাদা 3G/4G USB cellular modem dongle; USB connector খোলা অবস্থায় দেখা যাচ্ছে",
    title: "USB Cellular Modem",
    en: "PORTABLE MODEM",
    caption: "USB dongle-এর ভেতরেই cellular modem, SIM interface ও antenna থাকে",
    body: "ল্যাপটপের USB port-এ লাগালেই এই dongle মোবাইল নেটওয়ার্কে যুক্ত হয়। ছোট্ট বাক্সের ভেতরে baseband modem radio wave modulate/demodulate করে, USB দিয়ে কম্পিউটারকে digital data দেয়।",
    points: ["USB দিয়ে power ও digital data যায়", "ভেতরের SIM/পরিচয় দিয়ে cellular network-এ register করে", "Antenna বাইরে আলাদা করে নাও দেখা যেতে পারে"],
    source: "https://commons.wikimedia.org/wiki/File:3G_4G_USB_dongle.jpg",
    credit: "Hystiff / CC0 · Wikimedia Commons",
    fit: "contain",
  },
];

type EmbeddedForm = "desktop" | "laptop" | "phone" | "gateway";

const EMBEDDED_FORMS: Record<
  EmbeddedForm,
  {
    label: string;
    icon: typeof Monitor;
    title: string;
    photo: DevicePhoto;
    flow: { title: string; sub: string }[];
    body: string;
    clues: string[];
  }
> = {
  desktop: {
    label: "ডেস্কটপের ভেতরে",
    icon: Monitor,
    title: "Motherboard-এর PCI slot-এ internal modem card",
    photo: {
      src: "modem-internal-card-real.jpg",
      alt: "একটি বাস্তব সবুজ PCI V.92 internal fax modem card; modem chipset, PCI connector এবং পেছনের bracket-এ দুটি telephone port দেখা যাচ্ছে",
      title: "Internal PCI Modem Card",
      en: "EMBEDDED · EXPANSION CARD",
      caption: "সবুজ কার্ডটিই modem—PCI connector motherboard-এ, telephone port কম্পিউটারের পেছনে",
      body: "পুরোনো ডেস্কটপে modem আলাদা বাক্স না হয়ে motherboard-এর PCI slot-এ কার্ড হিসেবে বসত। কার্ডের chipset modulation/demodulation করত; বাইরে থেকে শুধু LINE/PHONE port দেখা যেত।",
      points: ["সোনালি PCI edge connector motherboard-এ ঢোকে", "বড় কালো চিপটি modem chipset-এর অংশ", "পেছনের bracket-এর RJ-11 port দিয়ে টেলিফোন লাইন আসে"],
      source: "https://commons.wikimedia.org/wiki/File:PCI_V.92_Fax_Modem_Card_Digon3.jpg",
      credit: "Jonathan Zander / CC BY-SA 3.0 · Wikimedia Commons",
      fit: "contain",
    },
    flow: [
      { title: "CPU / OS", sub: "digital data" },
      { title: "PCI modem card", sub: "modulate / demodulate" },
      { title: "RJ-11 LINE port", sub: "কম্পিউটারের পেছনে" },
      { title: "Telephone line", sub: "analog signal" },
    ],
    body: "কার্ডটি কম্পিউটারের কেসের ভেতরেই থাকে। Software modem-কে serial device-এর মতো দেখে; কার্ডের DSP/chipset bit-কে টেলিফোন লাইনের উপযোগী wave-এ বদলায়। ফিরে আসা wave আবার bit হয়ে PCI bus দিয়ে CPU-র কাছে যায়।",
    clues: ["কম্পিউটারের পেছনে ছোট RJ-11 port", "Device Manager-এ modem হিসেবে আলাদা device", "আলাদা power adapter লাগে না—PCI slot থেকেই power পায়"],
  },
  laptop: {
    label: "ল্যাপটপের ভেতরে",
    icon: Laptop,
    title: "M.2 slot-এ ছোট radio/modem module",
    photo: {
      src: "nic-laptop-installed.jpg",
      alt: "ল্যাপটপের মাদারবোর্ডে স্ক্রু দিয়ে বসানো একটি বাস্তব ছোট M.2 wireless radio card এবং তার antenna তার",
      title: "M.2 Wireless Module",
      en: "EMBEDDED · MINI MODULE",
      caption: "ছোট M.2 কার্ড ও MAIN/AUX antenna তার—radio modem-এর কাজ এই module-এই হয়",
      body: "ছবির moduleটি Wi-Fi radio card; cellular WWAN modem-ও অনেক ল্যাপটপে প্রায় একই M.2 আকারে বসে। Module-এর baseband/RF অংশ bit-কে radio wave-এ modulate করে এবং আসা wave demodulate করে।",
      points: ["M.2 connector দিয়ে motherboard-এর সঙ্গে data ও power", "সূক্ষ্ম coaxial তার antenna-র দিকে যায়", "পাতলা ল্যাপটপে module-এর বদলে চিপ সরাসরি board-এ soldered থাকতে পারে"],
      source: "https://guides.frame.work/Guide/Cooler+Master+Mainboard+Case+Quick+Start+Guide/166",
      credit: "Framework Guides · source attribution",
    },
    flow: [
      { title: "Laptop CPU", sub: "packets" },
      { title: "M.2 modem/radio", sub: "baseband + RF" },
      { title: "Antenna leads", sub: "ঢাকনার ভেতরে" },
      { title: "Wi-Fi / cellular wave", sub: "বাতাসে" },
    ],
    body: "বাইরে থেকে কোনো modem দেখা যায় না, কারণ ছোট moduleটি ল্যাপটপের তলার ঢাকনার নিচে স্ক্রু দিয়ে বসানো। Antenna সাধারণত screen-এর চারপাশে লুকানো থাকে, যাতে signal ভালো পায়।",
    clues: ["তলার ঢাকনা খুললে ছোট আয়তাকার M.2 card", "MAIN ও AUX লেখা দুটি antenna connector", "Cellular মডেলে SIM slot বা eSIM থাকতে পারে"],
  },
  phone: {
    label: "স্মার্টফোনের ভেতরে",
    icon: Smartphone,
    title: "Mainboard-এ baseband modem ও RF চিপ",
    photo: {
      src: "modem-phone-board-real.jpg",
      alt: "একটি বাস্তব iPhone 3GS mainboard; application processor, digital baseband processor, UMTS transceiver ও RF power amplifier চিপগুলো বোর্ডে বসানো",
      title: "Smartphone Mainboard",
      en: "EMBEDDED · BASEBAND MODEM",
      caption: "ফোনের board-এই baseband processor ও RF transceiver—আলাদা modem বাক্স নেই",
      body: "স্মার্টফোনে modem সাধারণত main SoC-এর ভেতরে integrated অথবা পাশের baseband চিপে থাকে। এই বোর্ডে digital baseband processor ও UMTS transceiver আলাদা চিপ হিসেবে দেখা যায়; তারা cellular signal-এর modulation/demodulation সামলায়।",
      points: ["Baseband processor digital symbol তৈরি ও সিদ্ধান্ত নেয়", "RF transceiver carrier frequency-তে signal তোলে/নামায়", "Power amplifier ও antenna বাতাসে wave পাঠায়"],
      source: "https://commons.wikimedia.org/wiki/File:IPhone_3GS_-_mainboard-9936.jpg",
      credit: "© Raimond Spekking / CC BY-SA 4.0 · Wikimedia Commons",
      fit: "contain",
    },
    flow: [
      { title: "Apps processor", sub: "IP data" },
      { title: "Baseband modem", sub: "bit ↔ symbol" },
      { title: "RF transceiver + PA", sub: "carrier তৈরি" },
      { title: "Antenna", sub: "4G/5G wave" },
    ],
    body: "আধুনিক ফোনে এই অংশগুলো আরও ছোট ও একীভূত। তবু কাজের ধাপ একই: app-এর data baseband modem-এ symbol হয়, RF অংশ সেটিকে নির্দিষ্ট frequency-র wave-এ তোলে, antenna বাতাসে ছাড়ে।",
    clues: ["ফোন খুললে shield ঢাকা ছোট RF/baseband চিপ", "SIM/eSIM পরিচয় দেয়, কিন্তু নিজে modem নয়", "Signal bar আসলে এই modem-এর মাপা radio অবস্থা"],
  },
  gateway: {
    label: "Home gateway-তে",
    icon: Home,
    title: "এক বাক্সে modem + router + switch + Wi-Fi",
    photo: {
      src: "wireless-router.jpg",
      alt: "বাসার একটি বাস্তব wireless home gateway router; antenna ও সামনের status light দেখা যাচ্ছে",
      title: "Home Gateway Box",
      en: "EMBEDDED · ALL-IN-ONE",
      caption: "অনেক বাসার বাক্সে modem অংশটি router-এর সঙ্গে একই board-এ লুকানো থাকে",
      body: "ISP-দেওয়া অনেক home gateway-তে DSL/cable/fiber ONT modem, router/NAT, ৪-port Ethernet switch ও Wi-Fi access point একই circuit board-এ থাকে। বাইরে থেকে আলাদা অংশগুলো বোঝা যায় না।",
      points: ["DSL/coax/fiber port-এর ঠিক পরেই modem/ONT অংশ", "তারপর router অংশ LAN ও WAN আলাদা করে", "LAN port গুলো আসলে ভেতরের ছোট switch-এর port"],
      source: "https://commons.wikimedia.org/wiki/File:TP-Link_TL-WR841N-2920.jpg",
      credit: "Raimond Spekking / CC BY-SA 4.0 · Wikimedia Commons",
      fit: "contain",
    },
    flow: [
      { title: "ISP line", sub: "DSL / cable / fiber" },
      { title: "Modem / ONT block", sub: "signal ↔ frame" },
      { title: "Router + NAT", sub: "WAN ↔ LAN" },
      { title: "Switch + Wi-Fi AP", sub: "বাসার ডিভাইস" },
    ],
    body: "এই কারণে অনেকে পুরো বাক্সটাকেই শুধু “router” বলে। কিন্তু ভেতরে প্রথমে modem ISP-এর signal বোঝে, তারপর router IP পথ ঠিক করে, শেষে switch/Wi-Fi বাসার ডিভাইসগুলোর কাছে পৌঁছে দেয়।",
    clues: ["একটি বাক্সেই DSL/WAN, LAN ও Wi-Fi light", "Admin page-এ DSL sync, WAN IP ও Wi-Fi—তিন ধরনের তথ্য", "কিছু বাসায় ONT/modem আলাদা, router আলাদা বাক্সও থাকতে পারে"],
  },
};

function EmbeddedModemGuide() {
  const [form, setForm] = useState<EmbeddedForm>("phone");
  const selected = EMBEDDED_FORMS[form];
  const SelectedIcon = selected.icon;
  return (
    <section className="rounded-2xl border border-white/12 bg-[#070d18] p-4 md:p-5" aria-label="আধুনিক ডিভাইসের ভেতরে modem কীভাবে embed থাকে">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.17em] text-signal">EMBEDDED MODEM · INSIDE MODERN DEVICES</p>
          <h3 className="bangla mt-1.5 text-[17px] font-semibold text-white">এখন modem ডিভাইসের ভেতরে কীভাবে থাকে?</h3>
          <p className="bangla mt-1 max-w-3xl text-[12px] leading-relaxed text-muted">
            ডিভাইসের ধরন বদলাও—আসল ছবির পাশে দেখো ভেতরের কোন অংশ দিয়ে data গিয়ে modem অংশে পৌঁছায়।
          </p>
        </div>
        <ChoiceGroup
          label="ডিভাইসের ধরন"
          value={form}
          onChange={(value) => setForm(value as EmbeddedForm)}
          options={Object.entries(EMBEDDED_FORMS).map(([id, item]) => ({ id, label: item.label }))}
          size="sm"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <PhotoCard photo={selected.photo} />
        <div className="space-y-4">
          <div className="rounded-2xl border border-signal/25 bg-signal/[0.055] p-4">
            <p className="bangla flex items-center gap-2 text-[14px] font-semibold text-white">
              <SelectedIcon size={17} className="text-signal" /> {selected.title}
            </p>
            <p className="bangla mt-2 text-[12.5px] leading-relaxed text-muted">{selected.body}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-4" aria-label="ডিভাইসের ভেতরে modem পর্যন্ত data-র পথ">
            {selected.flow.map((step, index) => (
              <div key={step.title} className={cn("relative rounded-xl border p-3", index === 1 ? "border-warn/50 bg-warn/[0.08]" : "border-white/10 bg-white/[0.025]")}>
                {index === 1 ? <AudioWaveform size={17} className="text-warn" /> : index === 0 ? <Cpu size={17} className="text-signal" /> : index === 2 ? <CircuitBoard size={17} className="text-laser" /> : <Radio size={17} className="text-signal" />}
                <p className="bangla mt-2 text-[11.5px] font-semibold leading-snug text-white">{step.title}</p>
                <p className="bangla mt-1 text-[10px] leading-snug text-faint">{step.sub}</p>
                {index < selected.flow.length - 1 && <span className="absolute -right-1.5 top-1/2 hidden -translate-y-1/2 text-signal sm:block">→</span>}
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <h4 className="bangla flex items-center gap-2 text-[12.5px] font-semibold text-white"><Binary size={15} className="text-signal" /> বাইরে থেকে চেনার সূত্র</h4>
            <ul className="mt-2.5 space-y-1.5">
              {selected.clues.map((clue) => (
                <li key={clue} className="bangla flex gap-2 text-[11.5px] leading-relaxed text-muted">
                  <span className="mt-[0.65em] h-1 w-1 shrink-0 rounded-full bg-signal" /> {clue}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ModemStudy() {
  return (
    <div className="space-y-5">
      <Definition
        term="Modulator ও Demodulator (MODEM)"
        en="MODEM = MOdulator + DEModulator"
        body="Modulator digital bit-কে একটি carrier wave-এর amplitude, frequency বা phase বদলে এনকোড করে। অন্য প্রান্তে Demodulator সেই পরিবর্তন মেপে আবার bit বের করে। দুটো কাজ এক যন্ত্রে থাকলেই তাকে modem বলে।"
      />

      <EmbeddedModemGuide />

      <div>
        <h3 className="bangla text-[15px] font-semibold text-white">আলাদা modem-এর আরও তিনটি বাস্তব রূপ</h3>
        <p className="bangla mt-1 text-[12px] text-faint">সবগুলোর ভেতরের মূল কাজ একই—শুধু channel বদলায়: telephone line, DSL, অথবা cellular radio।</p>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {MODEM_PHOTOS.map((photo) => (
            <PhotoCard key={photo.src} photo={photo} />
          ))}
        </div>
      </div>

      <ModemSimulation />

      <Callout tone="violet" title="আজকের Wi-Fi, 4G/5G ও cable—সবখানেই একই ধারণা">
        <p>
          আধুনিক যন্ত্রে আলাদা “modem বাক্স” না দেখলেও modulation থেমে নেই। Wi-Fi চিপ, ফোনের baseband,
          cable modem ও Starlink terminal—সবাই bit-কে wave-এর পরিবর্তনে বসায় এবং অন্য প্রান্তে সেই
          পরিবর্তন পড়ে bit ফেরত আনে। Fiber ONT-তে মাধ্যম আলো, তাই সেখানে optical signal রূপান্তর ঘটে;
          তবু physical layer-এর মূল ভাবনা একই।
        </p>
      </Callout>
    </div>
  );
}
