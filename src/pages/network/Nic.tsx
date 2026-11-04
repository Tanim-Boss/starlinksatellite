import { networkPage } from "@/lib/network/nav";
import { Callout, Definition } from "@/components/NetworkLab/ui/primitives";
import { LabFooterNav, LabNav, LessonBlock, LessonHero } from "@/components/NetworkLab/ui/LessonPage";
import { NicPhotoGallery, NicWorkGuide } from "@/components/NetworkLab/NicPhotoGuide";

const PAGE = networkPage("nic");

export function NetworkNic() {
  return (
    <>
      <LabNav path={PAGE.path} />
      <LessonHero
        page={PAGE}
        lede="বাস্তব ছবিতে NIC-এর রূপ দেখো। ডেস্কটপ, ল্যাপটপ, ফোন ও ট্যাবলেটের ভেতরে এটি কীভাবে যুক্ত থাকে এবং ডাটা পাঠানো ও গ্রহণে এর কাজ কী—জেনে নাও।"
        objectives={["৪টি বাস্তব ছবি", "ডিভাইসে NIC-এর অবস্থান", "NIC-এর কাজ"]}
      />

      <LessonBlock index="০১" label="সহজ ব্যাখ্যা" title="সহজ ব্যাখ্যা: NIC কী?">
        <Definition
          term="নেটওয়ার্ক ইন্টারফেস কার্ড"
          en="NIC — Network Interface Card"
          body="NIC এমন একটি হার্ডওয়্যার ইন্টারফেস, যার মাধ্যমে কোনো ডিভাইস লোকাল নেটওয়ার্কে ডাটা পাঠাতে এবং গ্রহণ করতে পারে। ব্রাউজার বা অ্যাপ ডাটা তৈরি করে; NIC সেই ডাটাকে কেবল বা radio wave-এ পাঠানোর শারীরিক পথ তৈরি করে।"
        />
        <Callout tone="cyan" title="নামে ‘Card’, কিন্তু এখন সবসময় আলাদা কার্ড নয়">
          <p className="bangla">
            integrated NIC-এর ক্ষেত্রে একে <strong className="text-ink">Network Interface Controller</strong>ও
            বলা হয়। অনেক ডেস্কটপে controller motherboard-এ integrated থাকে, ল্যাপটপে ছোট M.2 Wi-Fi
            module বা soldered chip থাকে, আর ফোন ও ট্যাবলেটে ক্ষুদ্র wireless chip-ই NIC-এর কাজ করে।
          </p>
        </Callout>
      </LessonBlock>

      <LessonBlock
        index="০২"
        label="বাস্তব ছবি"
        title="বাস্তব ছবিতে NIC ও ডিভাইসে এর অবস্থান"
        aside={<span className="bangla text-[11.5px] text-faint">ছবিতে ক্লিক করে বড় করে দেখো</span>}
      >
        <NicPhotoGallery />
      </LessonBlock>

      <LessonBlock index="০৩" label="NIC-এর কাজ" title="NIC ঠিক কী কী কাজ করে?">
        <NicWorkGuide />
      </LessonBlock>

      <LabFooterNav path={PAGE.path} />
    </>
  );
}
