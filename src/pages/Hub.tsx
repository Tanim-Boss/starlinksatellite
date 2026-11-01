import { Satellite, Server, ArrowUpRight, GraduationCap, MousePointerClick } from "lucide-react";
import type { ReactNode } from "react";
import { toBn } from "@/lib/format";
import { NAV_GROUPS } from "@/lib/content";
import { NETWORK_PAGES } from "@/lib/network/nav";
import { Eyebrow, Pill, Reveal } from "@/components/site/primitives";
import { Link } from "@/lib/router";
import { cn } from "@/utils/cn";

/**
 * The home page. It is a menu, not another article: one card per project, and
 * every page of both projects reachable from here in one click.
 */

function PageCard({
  to,
  num,
  title,
  note,
  active,
}: {
  to: string;
  num?: string;
  title: string;
  note?: string;
  active?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "panel panel-hover group flex h-full flex-col gap-2 p-4",
        active && "border-signal/45",
      )}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="bangla text-[14.5px] font-medium leading-snug text-white group-hover:text-signal">
          {title}
        </span>
        {num && (
          <span className="shrink-0 font-mono text-[10px] tracking-[0.16em] text-faint">{num}</span>
        )}
      </span>
      {note && (
        <span className="bangla text-[12.5px] leading-relaxed text-muted">{note}</span>
      )}
      <span className="mt-auto flex items-center gap-1.5 pt-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint transition-colors group-hover:text-signal">
        খুলে দেখো <ArrowUpRight size={12} />
      </span>
    </Link>
  );
}

function ProjectCard({
  group,
  icon,
  accent,
  intro,
}: {
  group: (typeof NAV_GROUPS)[number];
  icon: ReactNode;
  accent: string;
  intro: string;
}) {
  return (
    <Reveal className="panel overflow-hidden">
      <div className="flex flex-col gap-5 border-b border-white/[0.07] p-6 md:p-8">
        <div className="flex items-start gap-4">
          <span
            className={cn(
              "grid h-12 w-12 shrink-0 place-items-center rounded-2xl border",
              accent,
            )}
          >
            {icon}
          </span>
          <div>
            <Eyebrow>{group.label}</Eyebrow>
            <h2 className="bangla-heading mt-2 text-[clamp(1.5rem,3.4vw,2.15rem)] font-semibold leading-tight text-white">
              {group.bn}
            </h2>
            <p className="bangla mt-3 max-w-2xl text-[13.5px] leading-relaxed text-muted md:text-[14.5px]">
              {intro}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill tone={group.id === "network" ? "violet" : "cyan"}>
            {toBn(group.children.length)} টি পৃষ্ঠা
          </Pill>
          <Pill tone="slate">ইন্টারঅ্যাক্টিভ সিমুলেশন</Pill>
          <Pill tone="amber">শিক্ষামূলক মডেল</Pill>
        </div>
      </div>

      <ul className="grid gap-3 p-5 sm:grid-cols-2 md:p-6 lg:grid-cols-3">
        {group.children.map((child) => (
          <li key={child.path}>
            <PageCard
              to={child.path}
              title={child.label}
              note={child.note}
              num={
                group.id === "network"
                  ? NETWORK_PAGES.find((page) => page.path === child.path)?.num
                  : undefined
              }
            />
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

export function Hub() {
  const satellite = NAV_GROUPS[0];
  const network = NAV_GROUPS[1];

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/[0.06] pt-28 md:pt-36">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div className="page-shell relative pb-14">
          <Reveal>
            <Eyebrow>Interactive learning lab</Eyebrow>
            <h1 className="bangla-heading mt-5 max-w-4xl text-[clamp(2.1rem,6vw,3.9rem)] font-semibold leading-[1.18] tracking-[-0.01em] text-white">
              দুটি প্রজেক্ট, <span className="text-gradient">হাতে-কলমে শেখা</span>
            </h1>
            <p className="bangla mt-6 max-w-3xl text-[15px] leading-relaxed text-muted md:text-[17px]">
              এই সাইটে দুটি ইন্টারঅ্যাক্টিভ শিক্ষামূলক প্রজেক্ট আছে। একটিতে দেখা যায় স্যাটেলাইট
              দিয়ে কীভাবে ইন্টারনেট চলে, অন্যটিতে সহজ বাংলায় শেখানো হয় কম্পিউটার নেটওয়ার্কের মৌলিক
              ধারণা — সার্ভার, ক্লায়েন্ট, মিডিয়া, NIC, রিসোর্স, ইউজার ও প্রোটোকল।
            </p>
            <p className="bangla mt-4 max-w-3xl text-[13px] leading-relaxed text-faint">
              নিচের মেনু থেকে যেকোনো প্রজেক্ট বেছে নাও। সব সিমুলেশন ব্রাউজারের ভেতরেই চলে — আলাদা
              কোনো সার্ভার, ইন্টারনেট সংযোগ বা ইনস্টলেশন লাগে না।
            </p>
          </Reveal>

          <Reveal delay={90} className="mt-9 flex flex-wrap gap-3">
            <Link
              to={network.path}
              className="bangla inline-flex items-center gap-2 rounded-full bg-signal px-5 py-2.5 text-[13.5px] font-semibold text-[#04121a] transition-colors hover:bg-white"
            >
              <MousePointerClick size={15} />
              কম্পিউটার নেটওয়ার্ক ল্যাব শুরু করো
            </Link>
            <Link
              to={satellite.path}
              className="bangla inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-[13.5px] text-ink transition-colors hover:border-signal/50 hover:text-signal"
            >
              <Satellite size={15} />
              স্যাটেলাইট সিমুলেশন দেখো
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="page-shell py-16 md:py-20" aria-labelledby="projects-title">
        <h2 id="projects-title" className="sr-only">
          প্রজেক্ট মেনু
        </h2>
        <div className="grid gap-8">
          <ProjectCard
            group={satellite}
            icon={<Satellite size={22} className="text-signal" />}
            accent="border-signal/40 bg-signal/10"
            intro="ব্রডকাস্ট টিভি স্যাটেলাইট আর Starlink কনস্টেলেশনের তুলনা — ৩ডি মডেল, অরবিট, সিগন্যাল, কভারেজ ও লেটেন্সি। প্রতিটি পেজে ড্র্যাগ করে ঘোরানো যায়, জুম করা যায়।"
          />
          <ProjectCard
            group={network}
            icon={<Server size={22} className="text-laser" />}
            accent="border-laser/40 bg-laser/10"
            intro="স্কুল-কলেজের শিক্ষার্থীদের জন্য বাংলায় কম্পিউটার নেটওয়ার্ক ল্যাব। প্রতিটি অধ্যায়ে আছে সহজ ব্যাখ্যা, ক্লিক করা যায় এমন ডায়াগ্রাম, বাস্তব উদাহরণ আর ছোট কুইজ।"
          />
        </div>

        <Reveal delay={60} className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="panel p-5">
            <GraduationCap size={18} className="text-signal" />
            <h3 className="bangla mt-3 text-[14px] font-semibold text-white">কীভাবে শিখবে?</h3>
            <p className="bangla mt-2 text-[12.5px] leading-relaxed text-muted">
              প্রথমে নেটওয়ার্ক ল্যাবের হোম পেজ, তারপর একেকটি অংশ আলাদা করে। শেষে “ধাপে ধাপে শেখা”
              ও “চ্যালেঞ্জ মোড” দিয়ে নিজেকে যাচাই করো।
            </p>
          </div>
          <div className="panel p-5">
            <MousePointerClick size={18} className="text-laser" />
            <h3 className="bangla mt-3 text-[14px] font-semibold text-white">ক্লিক করে দেখো</h3>
            <p className="bangla mt-2 text-[12.5px] leading-relaxed text-muted">
              ডায়াগ্রামের প্রতিটি অংশে ক্লিক করলে তার নাম, কাজ ও বাস্তব উদাহরণ দেখা যায়। প্যাকেট
              পাঠিয়ে প্রতিটি ধাপের ব্যাখ্যাও পড়তে পারবে।
            </p>
          </div>
          <div className="panel p-5">
            <Satellite size={18} className="text-warn" />
            <h3 className="bangla mt-3 text-[14px] font-semibold text-white">এটি সিমুলেশন</h3>
            <p className="bangla mt-2 text-[12.5px] leading-relaxed text-muted">
              সবকিছু শিক্ষামূলক সরলীকরণ। কোনো লাইভ ডাটা, আসল সার্ভার বা প্রকৃত নেটওয়ার্ক ট্রাফিক
              ব্যবহার করা হয় না।
            </p>
          </div>
        </Reveal>
      </section>
    </>
  );
}
