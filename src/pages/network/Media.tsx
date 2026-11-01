import { networkPage } from "@/lib/network/nav";
import { QUIZZES } from "@/lib/network/copy";
import { Callout, Definition, RealExample, SimNote } from "@/components/NetworkLab/ui/primitives";
import { LabFooterNav, LabNav, LessonBlock, LessonHero } from "@/components/NetworkLab/ui/LessonPage";
import { Quiz } from "@/components/NetworkLab/ui/Quiz";
import { MediaVisual } from "@/components/NetworkLab/MediaVisual";

const PAGE = networkPage("media");

export function NetworkMedia() {
  return (
    <>
      <LabNav path={PAGE.path} />
      <LessonHero
        page={PAGE}
        lede="ডাটা কোন পথে চলে? তামার তার, কাচের ফাইবার না কি বাতাসের তরঙ্গ — একই ডাটা তিনটি মিডিয়ায় পাশাপাশি দেখো।"
        objectives={["Twisted pair", "Optical fiber", "Wi-Fi", "সংকেতের তুলনা"]}
      />

      <LessonBlock index="০১" label="সহজ ব্যাখ্যা" title="সহজ ব্যাখ্যা: মিডিয়া কী?">
        <Definition
          term="নেটওয়ার্ক মিডিয়া"
          en="Media / transmission medium"
          body="যে ভৌত মাধ্যম দিয়ে ডাটা এক প্রান্ত থেকে অন্য প্রান্তে যায়। কেবল হলে বৈদ্যুতিক সংকেত, ফাইবার হলে আলো, Wi-Fi হলে বেতার তরঙ্গ।"
        />
        <Callout tone="amber" title="মিডিয়া নিজে কিছুই ঠিক করে না">
          <p className="bangla">
            মিডিয়া শুধু মাধ্যম — এটি সার্ভার নয়, ক্লায়েন্ট নয়, প্রোটোকলও নয়। কোন ফরম্যাটে ডাটা যাবে
            তা ঠিক করে প্রোটোকল, আর পথ ঠিক করে সুইচ বা রাউটার। মিডিয়া কেবল সংকেত বহন করে।
          </p>
        </Callout>
      </LessonBlock>

      <LessonBlock
        index="০২"
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

      <LessonBlock index="০৩" label="বাস্তব উদাহরণ" title="বাস্তব উদাহরণ">
        <RealExample title="একই ল্যাব, দুই ধরনের মিডিয়া">
          ল্যাবের ডেস্কটপগুলো সুইচের সঙ্গে নীল Ethernet কেবলে যুক্ত, কারণ সেগুলো নড়বে না এবং
          স্থিতিশীল সংযোগ দরকার। শিক্ষকের ল্যাপটপ একই নেটওয়ার্কে Wi-Fi দিয়ে যুক্ত, কারণ সেটি নিয়ে
          ঘোরা দরকার। দুই ক্ষেত্রেই সার্ভার, প্রোটোকল ও কাজ একই — শুধু ডাটা চলার মাধ্যম বদলেছে।
        </RealExample>
        <Callout tone="violet" title="ফাইবার কেন দ্রুত ও দূরগামী?">
          <p className="bangla">
            ফাইবারে ডাটা চলে আলো হিসেবে, তাই বৈদ্যুতিক বাধা (noise) লাগে না এবং সংকেত অনেক দূর
            পর্যন্ত দুর্বল না হয়েই যায়। এ কারণে দেশের প্রধান সংযোগগুলো (backbone) ও ইন্টারনেটের
            বড় লাইনগুলো অপটিক্যাল ফাইবারে চলে।
          </p>
        </Callout>
      </LessonBlock>

      <LessonBlock index="০৪" label="কুইজ" title="নিজে যাচাই করো">
        <Quiz questions={QUIZZES.media} />
        <SimNote />
      </LessonBlock>

      <LabFooterNav path={PAGE.path} />
    </>
  );
}
