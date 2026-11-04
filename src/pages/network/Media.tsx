import { networkPage } from "@/lib/network/nav";
import { QUIZZES } from "@/lib/network/copy";
import { Callout, Definition, RealExample, SimNote } from "@/components/NetworkLab/ui/primitives";
import { LabFooterNav, LabNav, LessonBlock, LessonHero } from "@/components/NetworkLab/ui/LessonPage";
import { Quiz } from "@/components/NetworkLab/ui/Quiz";
import { MediaVisual } from "@/components/NetworkLab/MediaVisual";
import { CableGallery, MediaCredits } from "@/components/NetworkLab/CableGallery";
import { WirelessJourney } from "@/components/NetworkLab/WirelessJourney";

const PAGE = networkPage("media");

export function NetworkMedia() {
  return (
    <>
      <LabNav path={PAGE.path} />
      <LessonHero
        page={PAGE}
        lede="ডাটা কোন পথে চলে? কোঅ্যাক্সিয়াল, ইথারনেট ও অপটিক্যাল কেবল হাতে-কলমে চিনে নাও, তারপর দেখো কীভাবে কোনো তার ছাড়াই বাতাস দিয়ে একই ডাটা যায়।"
        objectives={["Coaxial cable", "Ethernet cable", "Optical fiber", "Connectors", "Wireless media"]}
      />

      <LessonBlock index="০১" label="সহজ ব্যাখ্যা" title="সহজ ব্যাখ্যা: মিডিয়া কী?">
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
        <Callout tone="amber" title="মিডিয়া নিজে কিছুই ঠিক করে না">
          <p className="bangla">
            মিডিয়া শুধু মাধ্যম — এটি সার্ভার নয়, ক্লায়েন্ট নয়, প্রোটোকলও নয়। কোন ফরম্যাটে ডাটা যাবে
            তা ঠিক করে প্রোটোকল, আর পথ ঠিক করে সুইচ বা রাউটার। মিডিয়া কেবল সংকেত বহন করে।
          </p>
        </Callout>
      </LessonBlock>

      <LessonBlock
        index="০২"
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
        index="০৩"
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
        index="০৪"
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

      <LessonBlock index="০৫" label="বাস্তব উদাহরণ" title="বাস্তব উদাহরণ">
        <RealExample title="একই ল্যাব, দুই ধরনের মিডিয়া">
          ল্যাবের ডেস্কটপগুলো সুইচের সঙ্গে নীল Ethernet কেবলে যুক্ত, কারণ সেগুলো নড়বে না এবং
          স্থিতিশীল সংযোগ দরকার। শিক্ষকের ল্যাপটপ একই নেটওয়ার্কে Wi-Fi দিয়ে যুক্ত, কারণ সেটি নিয়ে
          ঘোরা দরকার। দুই ক্ষেত্রেই সার্ভার, প্রোটোকল ও কাজ একই — শুধু ডাটা চলার মাধ্যম বদলেছে।
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

      <LessonBlock index="০৬" label="কুইজ" title="নিজে যাচাই করো">
        <Quiz questions={QUIZZES.media} />
        <MediaCredits className="mt-4" />
        <SimNote className="mt-4" />
      </LessonBlock>

      <LabFooterNav path={PAGE.path} />
    </>
  );
}
