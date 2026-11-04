import { networkPage } from "@/lib/network/nav";
import { SimNote } from "@/components/NetworkLab/ui/primitives";
import { LabFooterNav, LabNav, LessonBlock, LessonHero } from "@/components/NetworkLab/ui/LessonPage";
import { ClientServerSim } from "@/components/NetworkLab/ClientServerSim";
import { BrowserJourney } from "@/components/NetworkLab/BrowserJourney";

const PAGE = networkPage("server-client");

/**
 * This page is the client–server simulation and nothing else: send requests
 * from the laptops/desktop, watch the rack server queue and process them,
 * then turn the server off and see what a timeout looks like.
 */
export function NetworkServerClient() {
  return (
    <>
      <LabNav path={PAGE.path} />
      <LessonHero
        page={PAGE}
        lede="ল্যাপটপ ও ডেস্কটপ থেকে র‍্যাক সার্ভারে request পাঠাও — প্যাকেট যাওয়া-আসা, সার্ভারের অপেক্ষার কিউ, প্রসেসিং, নেটওয়ার্ক দেরি (latency) আর timeout, সব চোখের সামনে লাইভ দেখো।"
        objectives={["request", "response", "কিউ (queue)", "latency", "timeout"]}
      />

      <LessonBlock
        index="০১"
        label="ব্রাউজার থেকে সার্ভার"
        title="What happens when you visit a website?"
      >
        <BrowserJourney />
      </LessonBlock>

      <LessonBlock
        index="০২"
        label="ইন্টারঅ্যাক্টিভ সিমুলেশন"
        title="ক্লায়েন্ট–সার্ভার সিমুলেশন"
        aside={
          <span className="bangla text-[11.5px] text-faint">
            একজন একজন করে পাঠাও · সবাই একসাথে পাঠাও · সার্ভার বন্ধ করে দেখো
          </span>
        }
      >
        <ClientServerSim />
        <SimNote />
      </LessonBlock>

      <LabFooterNav path={PAGE.path} />
    </>
  );
}
