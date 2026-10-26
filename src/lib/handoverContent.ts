/**
 * Bangla teaching copy for the handover simulation.
 *
 * Kept out of the components so the explanation can be edited without touching
 * the simulation. English technical terms are kept in Latin script on purpose:
 * students meet those words in Starlink documentation and in the rest of this
 * site.
 */

export interface StepCopy {
  id: number;
  /** English label for the timeline rail. */
  rail: string;
  titleBn: string;
  leadEn: string;
  summaryBn: string;
  bodyBn: string[];
  /** Optional highlighted callout. */
  noteBn?: { title: string; body: string; tone?: "warn" | "info" };
}

export const STEP_COPY: StepCopy[] = [
  {
    id: 1,
    rail: "A connected",
    titleBn: "Satellite A-এর সঙ্গে সংযোগ",
    leadEn: "Step 1 · Link acquired",
    summaryBn:
      "Satellite A আকাশে দৃশ্যমান এবং dish এখন বৈদ্যুতিকভাবে তার দিকেই beam নির্দেশ করছে।",
    bodyBn: [
      "Starlink satellite পৃথিবী থেকে প্রায় ৫৫০ কিমি উপরে ঘণ্টায় প্রায় ২৭,০০০ কিমি বেগে চলছে। তাই কোনো satellite আপনার মাথার ঠিক উপরে স্থির থাকে না — একটি pass সাধারণত চার-পাঁচ মিনিটেই শেষ হয়।",
      "এখন Satellite A-এর elevation ২৫° mask-এর অনেক উপরে — অর্থাৎ দিগন্ত থেকে যথেষ্ট উঁচুতে — এবং ধীরে ধীরে বাড়ছে। তাই A দৃশ্যমান (visible) এবং সংযোগের জন্য উপযুক্ত। dish থেকে A পর্যন্ত উজ্জ্বল রেখাটিই Ku-band communication beam।",
      "বাস্তবে এই beam খালি চোখে দেখা যায় না — এখানে বোঝার সুবিধার জন্য দৃশ্যমান করা হয়েছে।",
    ],
    noteBn: {
      title: "মনে রাখুন",
      body:
        "dish-এর যান্ত্রিক দিক (mechanical tilt) ইনস্টল করার সময়ই ঠিক হয়ে যায়। satellite অনুসরণ করার জন্য পুরো dish ঘোরে না — beam-টি ঘোরে antenna element-গুলোর phase বদলে।",
      tone: "info",
    },
  },
  {
    id: 2,
    rail: "B approaches",
    titleBn: "Satellite B এগিয়ে আসছে",
    leadEn: "Step 2 · Candidate rising",
    summaryBn:
      "Satellite A ধীরে ধীরে দিগন্তের দিকে নামছে, আর পেছনের orbital plane থেকে Satellite B আকাশে উঠে আসছে।",
    bodyBn: [
      "প্রতিটি satellite-এর কক্ষপথ আগে থেকেই জানা। terminal ও নেটওয়ার্ক ephemeris থেকে হিসাব করে দেখে কোন satellite এখন কোথায়, তার elevation কত, আর কখন সেটি দিগন্তের নিচে চলে যাবে।",
      "B দিগন্তের উপরে উঠে আসছে — তার elevation বাড়ছে, আর কয়েক সেকেন্ডের মধ্যেই সে ২৫° mask-এর উপরে চলে আসবে। এরপর উপযুক্ত elevation-এ পৌঁছে সে সংযোগের candidate হয়ে উঠবে। এই সময়ে A-এর link পুরোপুরি সক্রিয় থাকে — অর্থাৎ এখনো কোনো handover হয়নি।",
      "নির্বাচনের সময় শুধু “সবচেয়ে কাছের satellite” দেখাই যথেষ্ট নয়। elevation ও visibility ছাড়াও satellite-এর available capacity, obstructions, gateway/ground-station routing এবং system scheduler-এর সিদ্ধান্ত কাজে লাগতে পারে।",
    ],
    noteBn: {
      title: "শিক্ষার্থীদের জন্য",
      body:
        "নীল/সায়ান রেখা = বর্তমান সংযোগ। হলুদ রেখা = পরবর্তী candidate, এখনো traffic বইছে না। ধূসর/লাল = দিগন্তের কাছে বা দৃশ্যমান নয়।",
      tone: "info",
    },
  },
  {
    id: 3,
    rail: "Prepare",
    titleBn: "Handover preparation",
    leadEn: "Step 3 · Make before break",
    summaryBn:
      "A এখন switch floor (৪০°) ছুঁইছুঁই। system B-কে পরবর্তী link হিসেবে প্রস্তুত করছে।",
    bodyBn: [
      "নতুন satellite-এর সঙ্গে link আগেই তৈরি করে নেওয়াকে make-before-break বলা হয়: নতুন link তৈরি হয়, পুরোনো link তখনো traffic বইছে, তারপর traffic সরানো হয়। এতে ব্যবহারকারীর কাছে বাধা কম লাগে।",
      "এখানে A ও B — দুটির beam-ই দেখা যাচ্ছে, কারণ প্রস্তুতি চলছে। কয়েক সেকেন্ডের এই overlap শুধু বোঝার সুবিধার জন্য ধীরে দেখানো হয়েছে।",
      "বাস্তবে হাজার হাজার terminal-এর জন্য link setup, frequency/time-slot allocation আর routing — সবই কয়েক মিলিসেকেন্ডের মধ্যে ঘটে যায়।",
    ],
    noteBn: {
      title: "সতর্কতা — সরলীকৃত উপস্থাপনা",
      body:
        "সব বাস্তব handover-এ দুটি পূর্ণ link একসঙ্গে দেখা যায় না। কিছু ক্ষেত্রে make-before-break, কিছু ক্ষেত্রে break-before-make হয়। এখানে দুই link-এর overlap শুধুই conceptual, নির্দিষ্ট কোনো বাস্তব পদ্ধতির অনুকরণ নয়।",
      tone: "warn",
    },
  },
  {
    id: 4,
    rail: "Transfer",
    titleBn: "Connection transfer: A → B",
    leadEn: "Step 4 · Beam transfer",
    summaryBn:
      "dish-এর phase pattern পুনরায় হিসাব হয়ে beam কয়েক মাইক্রোসেকেন্ডে Satellite B-এর দিকে সরে যাচ্ছে। পুরো dish ঘুরছে না।",
    bodyBn: [
      "phased-array antenna-র প্রতিটি element থেকে একই signal সামান্য ভিন্ন phase delay দিয়ে পাঠানো হয়। কোনো দিকে তরঙ্গগুলো একে অপরকে শক্তিশালী করে (constructive interference), অন্য দিকে দুর্বল করে — তাই beam বৈদ্যুতিকভাবে ঘুরতে পারে।",
      "নতুন satellite-এর দিকে beam সরাতে পুরো dish-কে মোটরের সাহায্যে ঘোরানো হয় না। শুধু element-গুলোর phase offset নতুন করে গণনা করা হয় — Dishy-তে ১,২৮০টি element আর ২০টি beamformer।",
      "Status panel-এ এবার দেখা যাবে: Previous satellite — STARLINK-SAT-A, New satellite — STARLINK-SAT-B, Connection status — Handover completed।",
    ],
    noteBn: {
      title: "যান্ত্রিক orientation ≠ handover",
      body:
        "dish-এর যান্ত্রিক দিক, satellite tracking এবং handover — এই তিনটি আলাদা বিষয়। যান্ত্রিক দিকটি ইনস্টলেশনের সময় একবার ঠিক হয়; tracking ও handover দুটোই ঘটে electronic beam steering-এ।",
      tone: "warn",
    },
  },
  {
    id: 5,
    rail: "A leaves",
    titleBn: "Satellite A coverage থেকে সরে যায়",
    leadEn: "Step 5 · Out of the mask",
    summaryBn:
      "A দিগন্তের দিকে নেমে যাচ্ছে; ২৫° elevation mask-এর নিচে নামার সঙ্গে সঙ্গেই সে আর ব্যবহারযোগ্য থাকবে না। Satellite B এখন primary connected satellite।",
    bodyBn: [
      "পৃথিবীর বাঁক আর satellite-এর উচ্চতার কারণে A ধীরে ধীরে দিগন্তের দিকে নেমে গেছে। terminal-এর জন্য এখন তার elevation এত কমে গেছে যে signal-এর পথে বাধা, বায়ুমণ্ডলীয় ক্ষতি আর দূরত্ব — সবই বেড়ে যায়।",
      "তাই A-কে ছেড়ে দেওয়া হয়েছে। A এবং B একই constellation-এর অংশ হলেও আলাদা orbital plane-এ চলে, ফলে একটির pass শেষ হলে অন্যটি প্রায়ই আকাশে উপস্থিত থাকে।",
      "একটি satellite ৯০–৯৫ মিনিটে একবার পৃথিবী প্রদক্ষিণ করে, কিন্তু আপনার আকাশে থাকে মাত্র কয়েক মিনিট — তাই প্রায় প্রতি ২–৪ মিনিটে একটি handover দরকার হয়।",
    ],
  },
  {
    id: 6,
    rail: "Next handover → C",
    titleBn: "Satellite C-এর সঙ্গে পরবর্তী handover",
    leadEn: "Step 6 · The cycle repeats",
    summaryBn:
      "একই প্রক্রিয়া আবার চলবে: C আকাশে উঠবে, উপযুক্ত elevation-এ পৌঁছালে B থেকে link C-তে transfer হবে।",
    bodyBn: [
      "B ধীরে ধীরে দিগন্তের দিকে নামবে, আর C উপরের দিকে উঠবে। C যখন switch floor-এর উপরে উপযুক্ত candidate হয়ে দাঁড়াবে, তখন আগের মতোই short preparation চলবে এবং beam B থেকে C-তে সরে যাবে।",
      "এভাবে একটি terminal দিনে শত শত handover করে। ব্যবহারকারী সাধারণত কিছুই টের পান না; তবু মাঝে মাঝে কয়েকশ মিলিসেকেন্ডের ছোট interruption হতে পারে।",
      "এই সিমুলেশনটি চলতে থাকলে পুরো চক্রটি আবার শুরু হয় — A আবার আকাশে উঠে আসে এবং গল্পটি পুনরাবৃত্তি হয়।",
    ],
    noteBn: {
      title: "সারমর্ম",
      body:
        "Satellite A connected → B approaches → prepare → transfer → A leaves → B connected → C approaches → transfer। এটাই Starlink-এর নিরন্তর handover চক্রের সরলীকৃত চিত্র।",
      tone: "info",
    },
  },
];

export interface ScienceQa {
  q: string;
  a: string;
}

export const SCIENCE_QA: ScienceQa[] = [
  {
    q: "Satellite কেন আকাশে চলতে থাকে?",
    a:
      "মহাকর্ষ satellite-কে পৃথিবীর দিকে টানে। কিন্তু যথেষ্ট অনুভূমিক (horizontal) গতি থাকলে সেটি মাটিতে পড়ে না গিয়ে পৃথিবীর চারপাশে বৃত্তাকার পথে ঘুরতে থাকে। ৫৫০ কিমি উচ্চতায় orbital speed প্রায় ৭.৬ কিমি/সেকেন্ড (২৭,০০০ কিমি/ঘণ্টার বেশি), আর এক পাক সম্পন্ন হতে লাগে প্রায় ৯৫ মিনিট।",
  },
  {
    q: "একটি satellite কেন সবসময় dish-এর উপরে থাকে না?",
    a:
      "পৃথিবীর বাঁক আর satellite-এর সীমিত উচ্চতার কারণে একটি satellite কেবল নির্দিষ্ট সময়ের জন্য দিগন্তের উপরে থাকে। ৫৫০ কিমি উচ্চতায় একটি satellite সাধারণত মাত্র কয়েক মিনিট ২৫° elevation mask-এর উপরে থাকে; এরপর সেটি দিগন্তের নিচে চলে যায় এবং অন্য satellite-কে জায়গা দেয়।",
  },
  {
    q: "পরবর্তী satellite কীভাবে যোগাযোগের উপযুক্ত candidate হয়?",
    a:
      "terminal নিজের অবস্থান এবং প্রতিটি satellite-এর ephemeris জেনে elevation, azimuth ও visibility হিসাব করে। যে satellite elevation mask-এর উপরে, যথেষ্ট উঁচু এবং ব্যবহারযোগ্য, সেটি candidate হয়। বাস্তব নেটওয়ার্কে available capacity, obstructions (গাছ/বাড়ি), gateway visibility, routing ও scheduling-ও বিবেচনা হতে পারে। প্রকৃত selection algorithm proprietary এবং পরিস্থিতিভেদে ভিন্ন হতে পারে।",
  },
  {
    q: "Satellite পরিবর্তনের সময় internet connection কীভাবে বজায় থাকে?",
    a:
      "মূল ধারণা make-before-break — নতুন link আগে তৈরি হয়, তারপর traffic পুরোনো link থেকে নতুন link-এ সরানো হয়, সবশেষে পুরোনো link ছাড়া হয়। প্যাকেট-লেভেলে রাউটিং, buffering ও retransmission ব্যবহারকারীর জন্য বাধা ঢেকে দেয়। তবু সিস্টেমে কয়েক মিলিসেকেন্ড থেকে সেকেন্ড পর্যন্ত ছোট gap হতে পারে।",
  },
  {
    q: "Phased-array antenna কীভাবে beam steer করতে পারে?",
    a:
      "phased array-তে অনেকগুলো ছোট antenna element পাশাপাশি বসানো থাকে। প্রতিটি element একই signal সামান্য ভিন্ন phase delay দিয়ে পাঠায়। কোনো নির্দিষ্ট দিকে সব element-এর তরঙ্গ একই phase-এ মিলে গিয়ে শক্তিশালী হয় (constructive interference), অন্য দিকে দুর্বল হয়ে যায়। element-গুলোর phase বদলালেই beam-এর দিক বদলায় — কোনো যন্ত্রাংশ নড়ে না। Dishy-তে প্রায় ১,২৮০টি element, ২০টি beamformer এবং প্রায় ১০০° field of view।",
  },
  {
    q: "Handover-এর সময় সাময়িক interruption কেন হতে পারে?",
    a:
      "beam re-tune মাইক্রোসেকেন্ডে হলেও নতুন satellite-এর সঙ্গে link তৈরি, time/frequency slot allocation, gateway পর্যন্ত পথ বদলানো এবং routing update-এ সময় লাগে। এছাড়া obstruction, capacity limit, নেটওয়ার্ক load বা আবহাওয়াজনিত fading-ও ছোট বিরতির কারণ হতে পারে।",
  },
];

export const HONESTY_NOTES: { t: string; d: string }[] = [
  {
    t: "শিক্ষামূলক মডেল, টেলিমেট্রি নয়",
    d:
      "ফুল-স্কাই মডেলে স্টারলিঙ্ক-শ্রেণির একটি শেলের ১,৫৮৪টি satellite-এর অবস্থান বৃত্তাকার কক্ষপথের সূত্র ও পৃথিবীর আহ্নিক ঘূর্ণন থেকে প্রতি মুহূর্তে হিসাব করা হয়; লেসন মডেলে তিনটি satellite-এর pass শিক্ষার সুবিধার্থে সাজানো। elevation থেকে slant range বাস্তব কক্ষপথের জ্যামিতি (R = ৬,৩৭১ কিমি, h = ৫৫০ কিমি) দিয়ে হিসাব করা, কিন্তু কখন কোন satellite আকাশে থাকবে তা লাইভ ট্র্যাকিং নয় — সিমুলেশন-জেনারেটেড মান।",
  },
  {
    t: "সরল handover policy",
    d:
      "serving satellite ৪০° elevation-এর নিচে নামলে এবং পরবর্তী candidate ৪০°-এর উপরে থাকলে handover হয়। বাস্তব scheduling-এ capacity, obstruction, gateway routing এবং নেটওয়ার্ক load-ও বিবেচনা করা হয়; SpaceX-এর প্রকৃত handover algorithm প্রকাশ্য নয়।",
  },
  {
    t: "স্থির panel, বৈদ্যুতিক beam",
    d:
      "dish-এর panel যান্ত্রিকভাবে ঘোরে না — ইনস্টল করা অবস্থায় স্থির থাকে, শুধু beam বৈদ্যুতিকভাবে steer হয়। এখানে antenna array-টি ১৬ × ১২ ল্যাটিস হিসেবে আঁকা হয়েছে; বাস্তবে ১,২৮০টি element ষড়ভুজাকার (hexagonal) সজ্জায় থাকে।",
  },
  {
    t: "স্কেল ও সময়",
    d:
      "উচ্চতা ও দূরত্ব স্কেলে সঠিক (১ একক = পৃথিবীর ব্যাসার্ধ ৬,৩৭১ কিমি)। dish ও satellite-গুলো বোঝার সুবিধার জন্য বাস্তবের তুলনায় অনেক বড় আঁকা। ১× গতিতে animation বাস্তব সময়ের চেয়ে ২০ গুণ দ্রুত চলে — বাস্তবে একটি pass প্রায় ৪–৫ মিনিট স্থায়ী হয়।",
  },
];
