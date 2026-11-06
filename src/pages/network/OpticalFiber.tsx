import { networkPage } from "@/lib/network/nav";
import { SimNote } from "@/components/NetworkLab/ui/primitives";
import {
  LabNav,
  LabFooterNav,
  LessonHero,
  LessonBlock,
} from "@/components/NetworkLab/ui/LessonPage";
import { Reveal } from "@/components/site/primitives";
import { OpticalFiberTIR } from "@/components/NetworkLab/OpticalFiberTIR";
import { OpticalFiberStructure } from "@/components/NetworkLab/OpticalFiberStructure";
import { OpticalFiberFlow } from "@/components/NetworkLab/OpticalFiberFlow";
import { OpticalFiberData } from "@/components/NetworkLab/OpticalFiberData";

const PAGE = networkPage("optical-fiber");

export function NetworkOpticalFiber() {
  return (
    <>
      <LabNav path={PAGE.path} />
      <LessonHero
        page={PAGE}
        lede="অপটিকাল ফাইবারের ভেতর আলো কীভাবে চলে, ফাইবারের ভেতর ও বাইরের কাঠামো কেমন এবং এক প্রান্তের ডাটা কীভাবে আলোর পルス হয়ে অন্য প্রান্তে পৌঁছায় — চারটি ইন্টারঅ্যাক্টিভ সিমুলেশন সহ।"
        objectives={[
          "পূর্ণ অভ্যন্তরীণ প্রতিফলন",
          "ফাইবারের অভ্যন্তরীণ ও বাহ্যিক কাঠামো",
          "ফাইবারের মধ্য দিয়ে আলোর প্রবাহ",
          "ডাটা থেকে আলোর পルス, আর পルス থেকে ডাটা",
        ]}
      />

      <section className="page-shell py-8">
        <Reveal>
          <p className="bangla max-w-3xl text-[13.5px] leading-relaxed text-muted">
            অপটিকাল ফাইবার হলো অত্যন্ত শುದ್ಧ কাচ বা প্লাস্টিকের একটি অপটিকাল ফাইবার হলো শুদ্ধ কাচ বা পলিমারের পাতলা ও নমনীয় সুতোর মতো একটি মাধা, যা আলো দীর্ঘ দূরত্ব নিয়ে যায়। ফাইবারের কোর-ক্ল্যাডিং সীমানায় পূর্ণ অভ্যন্তরীণ প্রতিফলনের মাধ্যমে আলো বাঁকা পথে চলে কিন্তু বেরিয়ে পড়ে না। আধুনিক ইন্টারনেটের বড় লাইনগুলো (ব্যাকবোন) ডাটা এই মাধ্যমে আলো হিসেবে বহন করে।
          </p>
        </Reveal>
      </section>

      <div id="sim-1" className="scroll-mt-32">
        <LessonBlock
          index="১"
          label="সিমুলেশন ১"
          title="পূর্ণ অভ্যন্তরীণ প্রতিফলন — লেজার আর কাঁচ"
        >
          <OpticalFiberTIR />
        </LessonBlock>
      </div>

      <div id="sim-2" className="scroll-mt-32">
        <LessonBlock
          index="২"
          label="সিমুলেশন ২"
          title="অপটিকাল ফাইবারের অভ্যন্তরীণ ও বাহ্যিক কাঠামো"
        >
          <OpticalFiberStructure />
        </LessonBlock>
      </div>

      <div id="sim-3" className="scroll-mt-32">
        <LessonBlock
          index="৩"
          label="সিমুলেশন ৩"
          title="ফাইবারের মধ্য দিয়ে আলোর প্রবাহ"
        >
          <OpticalFiberFlow />
        </LessonBlock>
      </div>

      <div id="sim-4" className="scroll-mt-32">
        <LessonBlock
          index="৪"
          label="সিমুলেশন ৪"
          title="ডাটা থেকে আলোর পルス, আর পルス থেকে ডাটা"
        >
          <OpticalFiberData />
        </LessonBlock>
      </div>

      <section className="page-shell py-10">
        <Reveal>
          <SimNote />
        </Reveal>
      </section>

      <LabFooterNav path={PAGE.path} />
    </>
  );
}
