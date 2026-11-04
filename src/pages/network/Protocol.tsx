import { networkPage } from "@/lib/network/nav";
import { HTTP_REQUEST, HTTP_RESPONSE, QUIZZES } from "@/lib/network/copy";
import { Callout, Definition, RealExample } from "@/components/NetworkLab/ui/primitives";
import { LabFooterNav, LabNav, LessonBlock, LessonHero } from "@/components/NetworkLab/ui/LessonPage";
import { Quiz } from "@/components/NetworkLab/ui/Quiz";
import { ProtocolVisual } from "@/components/NetworkLab/ProtocolVisual";

const PAGE = networkPage("protocol");

export function NetworkProtocol() {
  return (
    <>
      <LabNav path={PAGE.path} />
      <LessonHero
        page={PAGE}
        lede="দুটি কম্পিউটার একে অপরকে বোঝে কীভাবে? নিয়ম মেনে। HTTP-র একটি সরল request-response দেখো, তারপর নিয়ম ভাঙলে কী হয় তা পরীক্ষা করো।"
        objectives={["HTTP request", "HTTP response", "message inspector", "নিয়ম ভাঙার সিমুলেশন"]}
      />

      <LessonBlock index="০১" label="সহজ ব্যাখ্যা" title="সহজ ব্যাখ্যা: প্রোটোকল কী?">
        <Definition
          term="প্রোটোকল"
          en="Protocol"
          body="নেটওয়ার্ক কমিউনিকেশনের নিয়ম ও conventions-এর সমষ্টি — কে, কীভাবে, কোন ক্রমে এবং কোন ফরম্যাটে বার্তা আদান-প্রদান করবে।"
        />
        <Callout tone="cyan" title="HTTP একটি স্তরের প্রোটোকল">
          <p className="bangla">
            HTTP হলো application-layer প্রোটোকল, অর্থাৎ ব্রাউজার ও ওয়েব সার্ভারের ভাষা। কিন্তু
            নেটওয়ার্কে কথা বলতে আরও কয়েক স্তরের নিয়ম লাগে — ঠিকানা দেওয়া, প্যাকেট ভাগ করা, সংযোগ
            ঠিক রাখা। প্রতিটি স্তরে আলাদা প্রোটোকল কাজ করে।
          </p>
        </Callout>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#04060d]">
            <p className="bangla border-b border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-[12px] font-semibold text-signal">
              Request (সরলীকৃত)
            </p>
            <pre className="net-code p-4">{HTTP_REQUEST.join("\n")}</pre>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#04060d]">
            <p className="bangla border-b border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-[12px] font-semibold text-laser">
              Response (সরলীকৃত)
            </p>
            <pre className="net-code p-4">{HTTP_RESPONSE.join("\n")}</pre>
          </div>
        </div>
        <p className="bangla text-[11.5px] leading-relaxed text-faint">
          উপরের বার্তা দুটি বোঝানোর জন্য ছোট করে লেখা। বাস্তব HTTP বার্তায় অনেক বেশি header,
          সংযোগের তথ্য, ভাষা ও নিরাপত্তা সম্পর্কিত অংশ থাকে।
        </p>
      </LessonBlock>

      <LessonBlock
        index="০২"
        label="ইন্টারঅ্যাক্টিভ সিমুলেশন"
        title="HTTP request-response ও নিয়মের পরীক্ষা"
        aside={
          <span className="bangla text-[11.5px] text-faint">
            ধাপ চালানো · বার্তা বেছে পাঠানো
          </span>
        }
      >
        <ProtocolVisual />
      </LessonBlock>

      <LessonBlock index="০৩" label="বাস্তব উদাহরণ" title="বাস্তব উদাহরণ">
        <RealExample title="404 — পেজ পাওয়া যায়নি">
          ব্রাউজারে ভুল ঠিকানা লিখলে সার্ভার “404 Not Found” দেখায়। এর মানে নেটওয়ার্ক কাজ করেনি তা
          নয় — request ঠিকই সার্ভারে পৌঁছেছে, সার্ভার প্রোটোকল মেনে জবাব দিয়েছে যে চাওয়া জিনিসটি
          তার কাছে নেই। অর্থাৎ ব্যর্থতাও প্রোটোকলের নিয়মেই জানানো হয়।
        </RealExample>
        <Callout tone="amber" title="নিয়ম না মানলে বোঝাপড়াই হয় না">
          <p className="bangla">
            দুই প্রান্ত একই নিয়ম মানে বলেই বার্তা পড়া যায়। request-এর ফরম্যাট ভুল হলে, প্রয়োজনীয়
            অংশ না থাকলে বা অচেনা নিয়ম ব্যবহার করলে সার্ভার বার্তা প্রত্যাখ্যান করে। উপরের সিমুলেশনে
            সেটাই পরীক্ষা করা হয়েছে।
          </p>
        </Callout>
      </LessonBlock>

      <LessonBlock index="০৪" label="কুইজ" title="নিজে যাচাই করো">
        <Quiz questions={QUIZZES.protocol} />
      </LessonBlock>

      <LabFooterNav path={PAGE.path} />
    </>
  );
}
