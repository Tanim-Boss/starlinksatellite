import { networkPage } from "@/lib/network/nav";
import { QUIZZES } from "@/lib/network/copy";
import { Callout, Definition, RealExample, SimNote } from "@/components/NetworkLab/ui/primitives";
import { LabFooterNav, LabNav, LessonBlock, LessonHero } from "@/components/NetworkLab/ui/LessonPage";
import { Quiz } from "@/components/NetworkLab/ui/Quiz";
import { EmailScenario } from "@/components/NetworkLab/EmailScenario";

const PAGE = networkPage("server-client");

export function NetworkServerClient() {
  return (
    <>
      <LabNav path={PAGE.path} />
      <LessonHero
        page={PAGE}
        lede="একটি ইমেইল পাঠানোর গল্প ধরে ধরে দেখো — কোথায় request তৈরি হয়, কে সার্ভিস দেয়, আর জবাব কীভাবে ফিরে আসে।"
        objectives={["request", "response", "ভূমিকা বদল", "৬ ধাপের সিমুলেশন"]}
      />

      <LessonBlock index="০১" label="সহজ ব্যাখ্যা" title="সহজ ব্যাখ্যা: সার্ভার ও ক্লায়েন্ট">
        <div className="grid gap-3 md:grid-cols-2">
          <Definition
            term="সার্ভার"
            en="Server"
            body="যে কম্পিউটার বা সিস্টেম নেটওয়ার্কের মাধ্যমে অন্যদের service বা resource সরবরাহ করে। এটি request-এর জবাব দেয়।"
          />
          <Definition
            term="ক্লায়েন্ট"
            en="Client"
            body="যে ডিভাইস বা সফটওয়্যার কোনো সার্ভিস ব্যবহার করার জন্য request করে। ক্লায়েন্ট নিজে সার্ভিস তৈরি করে না, চেয়ে নেয়।"
          />
        </div>
        <Callout tone="violet" title="সবচেয়ে গুরুত্বপূর্ণ কথা">
          <p className="bangla">
            সার্ভার ও ক্লায়েন্ট হলো ভূমিকা (role), কোনো বিশেষ যন্ত্র নয়। একই কম্পিউটার এক পরিস্থিতিতে
            ক্লায়েন্ট এবং অন্য পরিস্থিতিতে সার্ভার হিসেবে কাজ করতে পারে। একটি নেটওয়ার্কে একাধিক
            সার্ভার ও একাধিক ক্লায়েন্ট থাকতে পারে।
          </p>
        </Callout>
      </LessonBlock>

      <LessonBlock
        index="০২"
        label="ইন্টারঅ্যাক্টিভ সিমুলেশন"
        title="একটি ইমেইল পাঠানোর ছয় ধাপ"
        aside={
          <span className="bangla text-[11.5px] text-faint">
            চালু করো · ধাপে ধাপে এগোও · রিসেট করো
          </span>
        }
      >
        <EmailScenario />
        <SimNote />
      </LessonBlock>

      <LessonBlock index="০৩" label="বাস্তব উদাহরণ" title="বাস্তব উদাহরণ">
        <RealExample title="অ্যাসাইনমেন্ট জমা দেওয়া">
          রাফসান ল্যাবের কম্পিউটার থেকে শিক্ষককে ইমেইল পাঠায়। তখন তার কম্পিউটার ক্লায়েন্ট, আর
          বিদ্যালয়ের ইমেইল সার্ভার হলো সার্ভার। আবার সেই ইমেইল সার্ভারই যখন শিক্ষকের ফোনের ইমেইল
          অ্যাপকে বার্তাটি পৌঁছে দেয়, তখন শিক্ষকের ফোন ক্লায়েন্ট। একই ব্যবস্থায় ভূমিকা বদলাচ্ছে,
          যন্ত্র নয়।
        </RealExample>
        <Callout tone="cyan" title="response না এলে কী হয়?">
          <p className="bangla">
            নেটওয়ার্ক কমিউনিকেশন সাধারণত দুই অংশে হয় — request ও response। সার্ভার কাজ করলেও
            response ফিরতে দেরি হলে বা না এলে ক্লায়েন্ট অপেক্ষা করে, শেষে timeout বা error দেখায়।
            তাই “কাজ হয়েছে কি না” জানার একমাত্র উপায় হলো response।
          </p>
        </Callout>
      </LessonBlock>

      <LessonBlock index="০৪" label="কুইজ" title="নিজে যাচাই করো">
        <Quiz questions={QUIZZES["server-client"]} />
      </LessonBlock>

      <LabFooterNav path={PAGE.path} />
    </>
  );
}
