import { networkPage } from "@/lib/network/nav";
import { QUIZZES } from "@/lib/network/copy";
import { Callout, Definition, RealExample, SimNote } from "@/components/NetworkLab/ui/primitives";
import { LabFooterNav, LabNav, LessonBlock, LessonHero } from "@/components/NetworkLab/ui/LessonPage";
import { Quiz } from "@/components/NetworkLab/ui/Quiz";
import { MediaVisual } from "@/components/NetworkLab/MediaVisual";
import { CableGallery, MediaCredits } from "@/components/NetworkLab/CableGallery";
import { WirelessJourney } from "@/components/NetworkLab/WirelessJourney";
import { HubStudy, ModemStudy, RouterStudy, SwitchStudy } from "@/components/NetworkLab/NetworkDevices";
import { Link } from "@/lib/router";

const PAGE = networkPage("media");

const DEVICE_LINKS = [
  { id: "hub", label: "Hub", note: "সবার কাছে broadcast" },
  { id: "switch", label: "Switch", note: "MAC table দেখে unicast" },
  { id: "router", label: "Router", note: "IP দেখে best next hop" },
  { id: "modem", label: "MODEM", note: "Bit ↔ carrier wave" },
];

export function NetworkMedia() {
  return (
    <>
      <LabNav path={PAGE.path} />
      <LessonHero
        page={PAGE}
        lede="ডাটা কোন পথে চলে, আর পথে কোন যন্ত্র কী সিদ্ধান্ত নেয়? Hub, Switch, Router ও MODEM-এর আসল ছবি ও সিমুলেশন দেখো; তারপর কোঅ্যাক্সিয়াল, ইথারনেট, অপটিক্যাল কেবল ও তারহীন মাধ্যম চিনে নাও।"
        objectives={["Hub", "Switch + MAC table", "Router + best path", "Modulator / Demodulator", "Cables + connectors", "Wireless media"]}
      />

      <LessonBlock index="০১" label="সহজ ব্যাখ্যা" title="সহজ ব্যাখ্যা: মিডিয়া ও সংযোগ-যন্ত্র">
        <Definition
          term="নেটওয়ার্ক মিডিয়া"
          en="Media / transmission medium"
          body="যে ভৌত মাধ্যম দিয়ে ডাটা এক প্রান্ত থেকে অন্য প্রান্তে যায়। কেবল হলে বৈদ্যুতিক সংকেত, ফাইবার হলে আলো, Wi-Fi হলে বেতার তরঙ্গ।"
        />
        <div className="grid gap-3 md:grid-cols-2">
          <Callout tone="cyan" title="Wired — তারের মাধ্যমে">
            <p className="bangla">
              ডাটা একটি নির্দিষ্ট তারের ভেতর দিয়ে যায়। কেউ সেই পথ ভাগ করে না, তাই সংকেত
              স্থিতিশীল থাকে। তবে তারের দৈর্ঘ্য, ভাঁজ ও ছেঁড়া ভাঙা সবই সংযোগের সীমা ঠিক করে।
            </p>
          </Callout>
          <Callout tone="violet" title="Wireless — বেতার মাধ্যমে">
            <p className="bangla">
              কোনো তার নেই; ডাটা তড়িৎ-চৌম্বকীয় তরঙ্গে বাতাসের ভেতর দিয়ে যায়। ডিভাইস নিয়ে
              ঘোরা যায়, কিন্তু দেয়াল, দূরত্ব ও অন্য নেটওয়ার্কের ভিড়ে সংকেত দুর্বল হয়।
            </p>
          </Callout>
        </div>
        <Callout tone="amber" title="মিডিয়া নিজে কিছুই ঠিক করে না—যন্ত্রেরা সিদ্ধান্ত নেয়">
          <p className="bangla">
            মিডিয়া শুধু মাধ্যম — এটি সার্ভার নয়, ক্লায়েন্ট নয়, প্রোটোকলও নয়। কোন ফরম্যাটে ডাটা যাবে
            তা ঠিক করে প্রোটোকল, আর পথ ঠিক করে সুইচ বা রাউটার। মিডিয়া কেবল সংকেত বহন করে। এই পেজের
            পরের চার অংশে সেই পথের ওপর কাজ করা চারটি গুরুত্বপূর্ণ যন্ত্রকে সিমুলেশনে দেখা হবে।
          </p>
        </Callout>
        <nav aria-label="এই পেজের ডিভাইস সিমুলেশন" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {DEVICE_LINKS.map((device) => (
            <Link
              key={device.id}
              to={PAGE.path}
              section={device.id}
              className="panel panel-hover group p-4"
              ariaLabel={`${device.label} অংশে যাও`}
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-signal">{device.label}</span>
              <span className="bangla mt-1.5 block text-[12px] leading-relaxed text-muted group-hover:text-ink">{device.note}</span>
              <span className="bangla mt-2 block text-[10px] text-faint">আসল ছবি + সিমুলেশন ↓</span>
            </Link>
          ))}
        </nav>
      </LessonBlock>

      <div id="hub" className="scroll-mt-32">
        <LessonBlock
          index="০২"
          label="Hub"
          title="Hub: সবার কাছে একই Data"
          aside={<span className="bangla text-[11.5px] text-faint">আসল ছবি · ১০ ডিভাইস · MAC সহ broadcast</span>}
        >
          <HubStudy />
        </LessonBlock>
      </div>

      <div id="switch" className="scroll-mt-32">
        <LessonBlock
          index="০৩"
          label="Switch"
          title="Switch: MAC শিখে শুধু প্রাপকের কাছে"
          aside={<span className="bangla text-[11.5px] text-faint">CAM table · flooding থেকে unicast</span>}
        >
          <SwitchStudy />
        </LessonBlock>
      </div>

      <div id="router" className="scroll-mt-32">
        <LessonBlock
          index="০৪"
          label="Router"
          title="Router: নেটওয়ার্ক থেকে নেটওয়ার্কে Best Next Hop"
          aside={<span className="bangla text-[11.5px] text-faint">Routing table · Dijkstra · লিংক কেটে দেখো</span>}
        >
          <RouterStudy />
        </LessonBlock>
      </div>

      <div id="modem" className="scroll-mt-32">
        <LessonBlock
          index="০৫"
          label="MODEM"
          title="Modulator ও Demodulator: Bit থেকে ঢেউ, ঢেউ থেকে Bit"
          aside={<span className="bangla text-[11.5px] text-faint">Embedded রূপ · ASK/FSK/PSK/QAM waveform</span>}
        >
          <ModemStudy />
        </LessonBlock>
      </div>

      <LessonBlock
        index="০৬"
        label="আসল ছবি"
        title="আসল কেবল ও তাদের কানেক্টর"
        aside={
          <span className="bangla text-[11.5px] text-faint">
            ছবিতে ট্যাপ করো · কেবল / কানেক্টর বদলে দেখো
          </span>
        }
      >
        <CableGallery />
      </LessonBlock>

      <LessonBlock
        index="০৭"
        label="ইন্টারঅ্যাক্টিভ সিমুলেশন"
        title="তিনটি মিডিয়া, একই ডাটা"
        aside={
          <span className="bangla text-[11.5px] text-faint">
            মিডিয়া বদলাও · Wi-Fi-তে দূরত্ব ও দেয়াল দেখো
          </span>
        }
      >
        <MediaVisual />
      </LessonBlock>

      <LessonBlock
        index="০৮"
        label="বেতার মাধ্যম"
        title="তার ছাড়া ডাটা কীভাবে যায়"
        aside={<span className="bangla text-[11.5px] text-faint">ধাপে ধাপে · modulation দেখো</span>}
      >
        <p className="bangla max-w-3xl text-[13.5px] leading-relaxed text-ink">
          এখানে কোনো কেবল নেই। অ্যাপের ডাটা Wi-Fi অ্যাডাপ্টারে তরঙ্গে বদলে যায়, অ্যান্টেনা
          সেটি বাতাসে ছড়িয়ে দেয়, আর অন্য প্রান্তের অ্যান্টেনা তরঙ্গ ধরে ফের বিটে ফিরিয়ে
          আনে। নিচের চিত্রে ধাপগুলো চালাও, দেয়াল যোগ করো, আর দেখো তরঙ্গে বিট বসানোর
          modulation কীভাবে গতি বদলায়।
        </p>
        <WirelessJourney />
      </LessonBlock>

      <LessonBlock index="০৯" label="বাস্তব উদাহরণ" title="বাস্তব উদাহরণ">
        <RealExample title="বাসা থেকে ওয়েবসাইট—সব যন্ত্র একসঙ্গে">
          তুমি ল্যাপটপে একটি ওয়েবসাইট খুললে। Wi-Fi radio-তে modem অংশ bit-কে তরঙ্গে বদলায়; বাসার
          gateway-র ভেতরের switch/Wi-Fi অংশ frame গ্রহণ করে; router অংশ Destination IP দেখে ISP-এর
          দিকে next hop বেছে নেয়; তারপর অনেক ISP ও backbone router একে একে নিজের table দেখে packet
          এগিয়ে দেয়। পুরোনো hub থাকলে প্রথম LAN-এই সবাই frame-এর কপি পেত—switch থাকায় তা শুধু
          দরকারি port-এ যায়। মাঝের পথ কখনো তামার কেবল, কখনো ফাইবারে আলো, কখনো বাতাসে তরঙ্গ।
        </RealExample>
        <div className="grid gap-3 md:grid-cols-2">
          <Callout tone="violet" title="ফাইবার কেন দ্রুত ও দূরগামী?">
            <p className="bangla">
              ফাইবারে ডাটা চলে আলো হিসেবে, তাই বৈদ্যুতিক বাধা (noise) লাগে না এবং সংকেত অনেক দূর
              পর্যন্ত দুর্বল না হয়েই যায়। এ কারণে দেশের প্রধান সংযোগগুলো (backbone) ও ইন্টারনেটের
              বড় লাইনগুলো অপটিক্যাল ফাইবারে চলে।
            </p>
          </Callout>
          <Callout tone="cyan" title="কোঅ্যাক্সিয়াল কেন এখনো টিকে আছে?">
            <p className="bangla">
              শিল্ডযুক্ত কোর থাকায় কোঅ্যাক্সিয়াল দীর্ঘ পথে কম ক্ষতিতে RF সংকেত বহন করে। তাই
              কেবল টিভি, CCTV আর স্যাটেলাইট ডিশের লাইনে এটি এখনো সবচেয়ে সস্তা ও নির্ভরযোগ্য
              সমাধান।
            </p>
          </Callout>
        </div>
      </LessonBlock>

      <LessonBlock index="১০" label="কুইজ" title="নিজে যাচাই করো">
        <Quiz questions={QUIZZES.media} />
        <MediaCredits className="mt-4" />
        <SimNote className="mt-4" />
      </LessonBlock>

      <LabFooterNav path={PAGE.path} />
    </>
  );
}
