import { networkPage } from "@/lib/network/nav";
import {
  HTTP_REQUEST,
  HTTP_RESPONSE,
  HTTPS_DEFINITION,
  PAYLOAD_SAMPLES,
  QUIZZES,
} from "@/lib/network/copy";
import { Callout, Definition, RealExample, SimNote } from "@/components/NetworkLab/ui/primitives";
import { LabFooterNav, LabNav, LessonBlock, LessonHero } from "@/components/NetworkLab/ui/LessonPage";
import { Quiz } from "@/components/NetworkLab/ui/Quiz";
import { ProtocolVisual } from "@/components/NetworkLab/ProtocolVisual";
import { HttpHttpsDiffTable, HttpVsHttps } from "@/components/NetworkLab/HttpVsHttps";
import { TlsHandshake } from "@/components/NetworkLab/TlsHandshake";

const PAGE = networkPage("protocol");

export function NetworkProtocol() {
  const example = PAYLOAD_SAMPLES[0];

  return (
    <>
      <LabNav path={PAGE.path} />
      <LessonHero
        page={PAGE}
        lede="দুটি কম্পিউটার নিয়ম মেনে কথা বলে। HTTP-র request-response দেখো, তারপর দেখো HTTPS-এ TLS handshake কীভাবে একটি গোপন চাবি ঠিক করে — আর একই বার্তা দুই পথে গেলে মাঝপথের মানুষ কী দেখতে পায়।"
        objectives={["HTTP request", "HTTPS + TLS handshake", "message inspector", "দুইয়ের পার্থক্য"]}
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
        label="ইন্টারঅ্যাকটিভ সিমুলেশন"
        title="HTTP request-response ও নিয়মের পরীক্ষা"
        aside={
          <span className="bangla text-[11.5px] text-faint">
            ধাপ চালানো · বার্তা বেছে পাঠানো
          </span>
        }
      >
        <ProtocolVisual />
      </LessonBlock>

      <LessonBlock
        index="০৩"
        label="তুলনা"
        title="HTTP বনাম HTTPS: একই বার্তা, দুই পথ"
        aside={<span className="bangla text-[11.5px] text-faint">প্যাকেট পাঠিয়ে মাঝপথের চোখে দেখো</span>}
      >
        <p className="bangla text-[13px] leading-relaxed text-muted">
          নিচে একই বার্তা একসঙ্গে দুই লেনে পাঠানো হবে — উপরে HTTP, নিচে HTTPS। মাঝপথে বসে থাকা
          attacker (যে কেউ: একই Wi-Fi-তে বসা কেউ, রাউটার বা ISP) দুই লেন থেকেই প্যাকেট ধরছে। প্রশ্নটি
          একটাই — সে কী পড়তে পারছে?
        </p>
        <HttpVsHttps />
        <Definition term="HTTPS" en="HTTP over TLS" body={HTTPS_DEFINITION} />
      </LessonBlock>

      <LessonBlock
        index="০৪"
        label="TLS handshake"
        title="TLS handshake: চাবি কীভাবে ঠিক হয়"
        aside={<span className="bangla text-[11.5px] text-faint">ধাপে ধাপে · সার্টিফিকেট পরীক্ষা</span>}
      >
        <p className="bangla text-[13px] leading-relaxed text-muted">
          HTTPS শুরুর আগে ব্রাউজার আর সার্ভার কয়েকটি বার্তা বিনিময় করে। এই কথাবার্তার নামই TLS
          handshake। এর কাজ দুটি: সার্ভারের পরিচয় যাচাই করা, আর দুই পক্ষের জন্য একটি গোপন
          session key ঠিক করা। নিচের চিত্রে “পরের ধাপ” চেপে পুরো কথোপকথনটি দেখো।
        </p>
        <TlsHandshake />
      </LessonBlock>

      <LessonBlock
        index="০৫"
        label="পার্থক্য"
        title="পার্থক্য এক নজরে"
        aside={<span className="bangla text-[11.5px] text-faint">HTTP = ৮০ · HTTPS = ৪৪৩</span>}
      >
        <HttpHttpsDiffTable />
        <div className="grid gap-3 md:grid-cols-2">
          <Callout tone="amber" title="HTTP-তে গোপনীয়তা বলে কিছু নেই">
            <p className="bangla">
              HTTP-তে প্যাকেট যতবার রাউটার, সুইচ বা কোনো Wi-Fi অ্যাক্সেস পয়েন্ট পার হয়, ততবারই
              তার ভেতরের লেখা পড়া যায়। পাবলিক Wi-Fi-তে ওয়েবসাইটের পাসওয়ার্ড HTTP দিয়ে গেলে সেটি
              কার্যত খোলা চিঠির মতো।
            </p>
          </Callout>
          <Callout tone="cyan" title="HTTPS গতি কমায় না বললেই চলে">
            <p className="bangla">
              প্রথম সংযোগে handshake-এর জন্য সামান্য সময় লাগে (প্রায় এক round trip)। এরপর session
              key পুনরায় ব্যবহার করা যায় (session resumption), তাই বাস্তবে পার্থক্য চোখে পড়ে না।
              এজন্যই এখন প্রায় সব সাইট HTTPS-এ চলে।
            </p>
          </Callout>
        </div>
        <Callout tone="violet" title="তালা মানেই বিশ্বাসযোগ্য নয়">
          <p className="bangla">
            তালা শুধু এই কথাটুকু বলে: সার্টিফিকেট যাচাই হয়েছে এবং ডাটা এনক্রিপ্টেড। কোনো সাইট নিজের
            সার্টিফিকেট নিজেই বানাতে পারে না — বিশ্বস্ত CA ছাড়া ব্রাউজার সংযোগ দেয় না। কিন্তু
            তালা থাকলেও ভুয়া সাইট ভুয়া সাইটই থাকে, তাই ঠিকানা (domain) মিলিয়ে দেখা জরুরি।
          </p>
        </Callout>
      </LessonBlock>

      <LessonBlock index="০৬" label="বাস্তব উদাহরণ" title="বাস্তব উদাহরণ">
        <RealExample title="404 — পেজ পাওয়া যায়নি">
          ব্রাউজারে ভুল ঠিকানা লিখলে সার্ভার “404 Not Found” দেখায়। এর মানে নেটওয়ার্ক কাজ করেনি তা
          নয় — request ঠিকই সার্ভারে পৌঁছেছে, সার্ভার প্রোটোকল মেনে জবাব দিয়েছে যে চাওয়া জিনিসটি
          তার কাছে নেই। অর্থাৎ ব্যর্থতাও প্রোটোকলের নিয়মেই জানানো হয়।
        </RealExample>
        <RealExample title={`${example.label}: একই লেখা, দুই ভাগ্য`}>
          ধরো তুমি ক্যাম্পাসের ওয়াই-ফাই থেকে ব্যাংকের সাইটে লগইন করছ। HTTP হলে তোমার পাঠানো
          “{example.plain}” একই নেটওয়ার্কে থাকা যে কেউ পড়ে ফেলতে পারে — {example.risk} কিন্তু
          HTTPS-এ সেই প্যাকেট শুধু সাইফারটেক্সট, আর সার্ভারের সার্টিফিকেট না মিললে ব্রাউজার সংযোগই
          দেয় না। তাই নিয়মটি সহজ: ঠিকানার পাশে তালা না দেখলে কোথাও পাসওয়ার্ড লেখো না।
        </RealExample>
        <Callout tone="amber" title="নিয়ম না মানলে বোঝাপড়াই হয় না">
          <p className="bangla">
            দুই প্রান্ত একই নিয়ম মানে বলেই বার্তা পড়া যায়। request-এর ফরম্যাট ভুল হলে, প্রয়োজনীয়
            অংশ না থাকলে বা অচেনা নিয়ম ব্যবহার করলে সার্ভার বার্তা প্রত্যাখ্যান করে। TLS-এর ক্ষেত্রেও
            তাই — কোনো একটি ধাপ ব্যর্থ হলে বাকি কথাবার্তা আর এগোয় না।
          </p>
        </Callout>
      </LessonBlock>

      <LessonBlock index="০৭" label="কুইজ" title="নিজে যাচাই করো">
        <Quiz questions={QUIZZES.protocol} />
        <SimNote />
      </LessonBlock>

      <LabFooterNav path={PAGE.path} />
    </>
  );
}
