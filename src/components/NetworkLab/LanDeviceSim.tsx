import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Database,
  Eraser,
  GraduationCap,
  MousePointerClick,
  Pause,
  Play,
  RotateCcw,
  Send,
  Shuffle,
  SkipForward,
  TableProperties,
  XCircle,
} from "lucide-react";
import {
  LAN_CENTER,
  LAN_DEVICES,
  lanDevice,
  shortMac,
  type LanDevice,
} from "@/lib/network/devices";
import { cn } from "@/utils/cn";
import { Button, ChoiceGroup } from "./ui/primitives";

type LanMode = "hub" | "switch";
type LanPhase =
  | "idle"
  | "toCenter"
  | "decide"
  | "forward"
  | "verdict"
  | "replyToCenter"
  | "learnReply"
  | "replyForward"
  | "replyVerdict"
  | "done";

interface LanRun {
  sourceId: string;
  destId: string;
  message: string;
  destinationKnown: boolean;
}

interface CamEntry {
  deviceId: string;
  learnedBy: string;
  order: number;
}

const PHASE_DURATIONS: Record<Exclude<LanPhase, "idle" | "done">, number> = {
  toCenter: 1150,
  decide: 1250,
  forward: 1350,
  verdict: 1150,
  replyToCenter: 1150,
  learnReply: 1100,
  replyForward: 1150,
  replyVerdict: 1000,
};

function phasesFor(mode: LanMode, destinationKnown: boolean): LanPhase[] {
  if (mode === "hub") return ["toCenter", "decide", "forward", "verdict", "done"];
  if (destinationKnown) return ["toCenter", "decide", "forward", "verdict", "done"];
  return [
    "toCenter",
    "decide",
    "forward",
    "verdict",
    "replyToCenter",
    "learnReply",
    "replyForward",
    "replyVerdict",
    "done",
  ];
}

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function pointBetween(from: { x: number; y: number }, to: { x: number; y: number }, t: number) {
  return { x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) };
}

function trimPacketStart(device: LanDevice) {
  const dx = LAN_CENTER.x - device.x;
  const dy = LAN_CENTER.y - device.y;
  const distance = Math.hypot(dx, dy) || 1;
  return { x: device.x + (dx / distance) * 82, y: device.y + (dy / distance) * 28 };
}

function trimPacketEnd(device: LanDevice) {
  const dx = device.x - LAN_CENTER.x;
  const dy = device.y - LAN_CENTER.y;
  const distance = Math.hypot(dx, dy) || 1;
  return { x: device.x - (dx / distance) * 82, y: device.y - (dy / distance) * 28 };
}

function centerPortPoint(device: LanDevice) {
  return {
    x: LAN_CENTER.x + (device.side === "left" ? -112 : 112),
    y: LAN_CENTER.y - 42 + ((device.port - 1) % 5) * 21,
  };
}

function DeviceGlyph({ device, active }: { device: LanDevice; active: boolean }) {
  const stroke = active ? "#7ee7e2" : "#9fb2cf";
  if (device.kind === "laptop") {
    return (
      <g transform={`translate(${device.x - 58} ${device.y - 2})`} aria-hidden>
        <rect x={-14} y={-12} width={28} height={19} rx={2.5} fill="#0b1a2e" stroke={stroke} strokeWidth={1.5} />
        <path d="M-18 10 L18 10 L22 16 L-22 16 Z" fill="#13243d" stroke={stroke} strokeWidth={1.2} />
        <circle cx={0} cy={-2} r={2.2} fill={stroke} opacity={0.8} />
      </g>
    );
  }
  return (
    <g transform={`translate(${device.x - 58} ${device.y - 2})`} aria-hidden>
      <rect x={-15} y={-13} width={30} height={21} rx={2.5} fill="#0b1a2e" stroke={stroke} strokeWidth={1.5} />
      <path d="M0 8 L0 14 M-9 16 L9 16" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />
      <rect x={-10} y={-8} width={14} height={2.4} rx={1.2} fill={stroke} opacity={0.65} />
      <rect x={-10} y={-3} width={19} height={2.4} rx={1.2} fill={stroke} opacity={0.4} />
    </g>
  );
}

function PacketChip({
  x,
  y,
  destinationMac,
  data,
  tone = "cyan",
}: {
  x: number;
  y: number;
  destinationMac: string;
  data: string;
  tone?: "cyan" | "violet";
}) {
  const stroke = tone === "cyan" ? "#3ddbd9" : "#a78bfa";
  const shownData = data.length > 11 ? `${data.slice(0, 10)}…` : data;
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <circle r={16} fill={stroke} opacity={0.16} className="net-packet-halo" />
      <rect x={-49} y={-19} width={98} height={38} rx={9} fill="#071326" fillOpacity={0.94} stroke={stroke} strokeWidth={1.4} />
      <circle cx={-38} cy={0} r={4.5} fill={stroke} />
      <text x={-29} y={-3} className="net-mono" fontSize={7.2} fill="#e9effc">
        Dst {shortMac(destinationMac)}
      </text>
      <text x={-29} y={9} fontSize={7.4} fill="#9fb2cf">
        “{shownData}”
      </text>
    </g>
  );
}

function LanSimulation({ mode }: { mode: LanMode }) {
  const reduced = useMemo(prefersReducedMotion, []);
  const [sourceId, setSourceId] = useState("pc-01");
  const [destId, setDestId] = useState("pc-07");
  const [message, setMessage] = useState("Hello from lab!");
  const [clickTarget, setClickTarget] = useState<"source" | "dest">("source");
  const [speed, setSpeed] = useState(1);
  const [run, setRun] = useState<LanRun | null>(null);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [cam, setCam] = useState<Record<string, CamEntry>>({});
  const [learnAllActive, setLearnAllActive] = useState(false);
  const [lastLearnedId, setLastLearnedId] = useState<string | null>(null);
  const progressRef = useRef(0);

  const phases = useMemo(
    () => (run ? phasesFor(mode, run.destinationKnown) : (["idle"] as LanPhase[])),
    [mode, run],
  );
  const phase: LanPhase = run ? phases[Math.min(phaseIndex, phases.length - 1)] : "idle";
  const phaseOrder = run ? phaseIndex : -1;
  const previewSource = lanDevice(sourceId);
  const previewDest = lanDevice(destId);
  const runSource = run ? lanDevice(run.sourceId) : previewSource;
  const runDest = run ? lanDevice(run.destId) : previewDest;
  const isReplyPhase = ["replyToCenter", "learnReply", "replyForward", "replyVerdict"].includes(phase);
  const frameSource = isReplyPhase ? runDest : runSource;
  const frameDest = isReplyPhase ? runSource : runDest;
  const frameData = isReplyPhase ? "Reply: পেয়েছি ✓" : run?.message ?? message;

  const originalRecipients = useMemo(() => {
    if (!run) return [] as LanDevice[];
    if (mode === "switch" && run.destinationKnown) return [runDest];
    return LAN_DEVICES.filter((device) => device.id !== run.sourceId);
  }, [mode, run, runDest]);

  const resetRun = useCallback(() => {
    setRun(null);
    setPhaseIndex(0);
    progressRef.current = 0;
    setProgress(0);
    setPlaying(false);
    setLastLearnedId(null);
  }, []);

  const learnMac = useCallback((deviceId: string, learnedBy: string) => {
    setLastLearnedId(deviceId);
    setCam((previous) => {
      if (previous[deviceId]) return previous;
      return {
        ...previous,
        [deviceId]: { deviceId, learnedBy, order: Object.keys(previous).length + 1 },
      };
    });
  }, []);

  const advancePhase = useCallback(() => {
    if (!run) return;
    if (mode === "switch" && phase === "toCenter") {
      learnMac(run.sourceId, "আসা frame-এর Source MAC");
    }
    if (mode === "switch" && phase === "replyToCenter") {
      learnMac(run.destId, "Reply frame-এর Source MAC");
    }
    const nextIndex = Math.min(phaseIndex + 1, phases.length - 1);
    setPhaseIndex(nextIndex);
    progressRef.current = reduced && phases[nextIndex] !== "done" ? 1 : 0;
    setProgress(progressRef.current);
    if (phases[nextIndex] === "done") setPlaying(false);
  }, [learnMac, mode, phase, phaseIndex, phases, reduced, run]);

  const advancePhaseRef = useRef(advancePhase);
  advancePhaseRef.current = advancePhase;

  useEffect(() => {
    if (!playing || !run || phase === "idle" || phase === "done") return;
    let frame = 0;
    let last = performance.now();
    const duration = PHASE_DURATIONS[phase as Exclude<LanPhase, "idle" | "done">] / speed;
    const tick = (now: number) => {
      const next = Math.min(1, progressRef.current + (now - last) / duration);
      progressRef.current = next;
      setProgress(next);
      if (next >= 1) {
        advancePhaseRef.current();
        return;
      }
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, playing, run, speed]);

  useEffect(() => {
    if (!learnAllActive || mode !== "switch") return;
    const timer = window.setInterval(() => {
      setCam((previous) => {
        const nextDevice = LAN_DEVICES.find((device) => !previous[device.id]);
        if (!nextDevice) {
          window.clearInterval(timer);
          setLearnAllActive(false);
          return previous;
        }
        setLastLearnedId(nextDevice.id);
        return {
          ...previous,
          [nextDevice.id]: {
            deviceId: nextDevice.id,
            learnedBy: "প্রতিটি ডিভাইসের hello frame",
            order: Object.keys(previous).length + 1,
          },
        };
      });
    }, 380);
    return () => window.clearInterval(timer);
  }, [learnAllActive, mode]);

  const changeSource = (id: string) => {
    setSourceId(id);
    if (id === destId) setDestId(sourceId);
    resetRun();
  };
  const changeDest = (id: string) => {
    setDestId(id);
    if (id === sourceId) setSourceId(destId);
    resetRun();
  };

  const pickDevice = (id: string) => {
    if (clickTarget === "source") {
      changeSource(id);
      setClickTarget("dest");
    } else {
      changeDest(id);
      setClickTarget("source");
    }
  };

  const startRun = () => {
    if (sourceId === destId) return;
    setLearnAllActive(false);
    setRun({
      sourceId,
      destId,
      message: message.trim() || "Hello!",
      destinationKnown: mode === "switch" && Boolean(cam[destId]),
    });
    setPhaseIndex(0);
    setLastLearnedId(null);
    progressRef.current = reduced ? 1 : 0;
    setProgress(progressRef.current);
    setPlaying(!reduced);
  };

  const nextPhase = () => {
    if (!run || phase === "done") return;
    if (progressRef.current < 1) {
      progressRef.current = 1;
      setProgress(1);
      return;
    }
    advancePhase();
  };

  const randomPair = () => {
    const nextSource = LAN_DEVICES[Math.floor(Math.random() * LAN_DEVICES.length)];
    let nextDest = LAN_DEVICES[Math.floor(Math.random() * LAN_DEVICES.length)];
    if (nextDest.id === nextSource.id) {
      nextDest = LAN_DEVICES[(LAN_DEVICES.indexOf(nextDest) + 3) % LAN_DEVICES.length];
    }
    setSourceId(nextSource.id);
    setDestId(nextDest.id);
    resetRun();
  };

  const arrivesOriginal = run && (phases.indexOf("verdict") >= 0 && phaseOrder >= phases.indexOf("verdict"));
  const arrivesReply = run && phases.includes("replyVerdict") && phaseOrder >= phases.indexOf("replyVerdict");
  const outgoingStarted = run && phaseOrder >= phases.indexOf("forward");
  const copiesSent = !run
    ? 0
    : (outgoingStarted ? originalRecipients.length : 0) +
      (phases.includes("replyForward") && phaseOrder >= phases.indexOf("replyForward") ? 1 : 0);
  const acceptedCount = arrivesOriginal ? 1 : 0;
  const discardedCount = arrivesOriginal ? Math.max(0, originalRecipients.length - 1) : 0;
  const unnecessaryCopies = mode === "hub" ? discardedCount : run && !run.destinationKnown ? discardedCount : 0;

  const status = (() => {
    if (!run) {
      return {
        title: mode === "hub" ? "Hub তৈরি—কিন্তু সে ঠিকানা বোঝে না" : "Switch তৈরি—CAM table দেখে সিদ্ধান্ত নেবে",
        body:
          mode === "hub"
            ? "প্রেরক ও প্রাপক বেছে Data পাঠাও। Frame Hub-এ পৌঁছালে Hub Destination MAC না পড়েই বাকি সব port-এ electrical signal-এর কপি পাঠিয়ে দেবে।"
            : "প্রেরক ও প্রাপক বেছে Data পাঠাও। Switch প্রথমে Source MAC শিখবে, তারপর CAM table-এ Destination MAC খুঁজবে। ঠিকানা জানা থাকলে শুধু ওই port-এই frame যাবে।",
      };
    }
    if (phase === "toCenter") {
      return {
        title: `${runSource.label} frame পাঠাচ্ছে`,
        body: `Ethernet frame-এ Source MAC ${frameSource.mac}, Destination MAC ${frameDest.mac} এবং Data “${frameData}” আছে। প্যাকেটের গায়ে Destination MAC ও Data দেখা যাচ্ছে।`,
      };
    }
    if (phase === "decide") {
      if (mode === "hub") {
        return {
          title: "Hub কোনো lookup করে না",
          body: "Hub Layer-1 repeater—সে MAC address পড়ে না, কোনো table রাখে না। আসা signal-কে শক্ত করে source port বাদে বাকি ৯টি port-এই repeat করাই তার একমাত্র কাজ।",
        };
      }
      return run.destinationKnown
        ? {
            title: "CAM table-এ Destination MAC পাওয়া গেছে",
            body: `Switch প্রথমে Source MAC ${runSource.mac} → P${runSource.port} শিখল। তারপর Destination MAC মিলিয়ে দেখল: ${runDest.mac} আছে P${runDest.port}-এ। তাই frame শুধু P${runDest.port}-এ যাবে।`,
          }
        : {
            title: "Destination MAC এখনো CAM table-এ নেই",
            body: `Switch Source MAC ${runSource.mac} → P${runSource.port} শিখে নিল, কিন্তু Destination MAC ${runDest.mac} কোন port-এ তা এখনো জানে না। তাই এই প্রথম frame-টি source port বাদে সব port-এ flood হবে।`,
          };
    }
    if (phase === "forward") {
      if (mode === "hub") {
        return { title: "একই frame-এর ৯টি কপি ছুটছে", body: "প্রতিটি কপিতেই একই Destination MAC ও একই Data। এবার প্রতিটি NIC নিজে ঠিকানা মিলিয়ে দেখবে—Hub কারো জন্য আলাদা সিদ্ধান্ত নেয়নি।" };
      }
      return run.destinationKnown
        ? { title: `শুধু P${runDest.port}-এর দিকে unicast`, body: "অন্য আটটি ডিভাইস এই frame-এর কোনো কপিই পাচ্ছে না। এটাই switch-এর filtering/forwarding—bandwidth বাঁচে, অপ্রয়োজনীয় interruption-ও হয় না।" }
        : { title: "Unknown unicast flooding হচ্ছে", body: "Destination জানা না থাকায় switch সাময়িকভাবে hub-এর মতো সব port-এ পাঠাচ্ছে। তবে প্রাপক reply দিলেই switch তার MAC শিখে ফেলবে।" };
    }
    if (phase === "verdict") {
      return {
        title: "প্রতিটি NIC Destination MAC মেলাচ্ছে",
        body:
          mode === "switch" && run.destinationKnown
            ? `${runDest.label}-এর NIC দেখল Destination MAC নিজের MAC-এর সঙ্গে হুবহু মিলেছে, তাই frame গ্রহণ করল। অন্য ডিভাইসগুলোর কাছে কোনো কপি যায়নি।`
            : `${runDest.label}-এর NIC ঠিকানা মিলিয়ে frame গ্রহণ করল। বাকি ${discardedCount}টি ডিভাইস কপি পেলেও Destination MAC না মেলায় frame বাতিল করল।`,
      };
    }
    if (phase === "replyToCenter") {
      return {
        title: `${runDest.label} reply পাঠাচ্ছে`,
        body: "Reply frame-এর Source MAC এখন প্রাপকের MAC। এই frame switch-এ পৌঁছালেই switch শিখবে কোন port দিয়ে ওই MAC এসেছে।",
      };
    }
    if (phase === "learnReply") {
      return {
        title: "Switch প্রাপকের MAC শিখে ফেলল",
        body: `CAM table-এ নতুন entry যোগ হলো: ${runDest.mac} → P${runDest.port}। Source MAC দেখে শেখা—এটাই switch-এর MAC learning। পরের বার একই প্রাপককে পাঠালে আর flood হবে না।`,
      };
    }
    if (phase === "replyForward") {
      return {
        title: "Reply এবার শুধু প্রেরকের port-এ",
        body: `Reply-র Destination MAC ${runSource.mac}; switch আগেই জানে এটি P${runSource.port}-এ আছে। তাই reply শুধু একটি port দিয়েই যাচ্ছে।`,
      };
    }
    if (phase === "replyVerdict") {
      return { title: "প্রেরক reply গ্রহণ করল", body: "দুই দিকের MAC-ই এখন CAM table-এ আছে। একই জোড়া দিয়ে আবার পাঠিয়ে দেখো—এবার প্রথম frame থেকেই unicast হবে।" };
    }
    return {
      title: mode === "hub" ? "Hub broadcast শেষ" : run.destinationKnown ? "Switch unicast শেষ" : "Flooding থেকে learning শেষ",
      body:
        mode === "hub"
          ? `মোট ${copiesSent}টি কপি গেল, গ্রহণ করল ১টি ডিভাইস, বাতিল করল ${discardedCount}টি। Hub-এ সবাই একই collision domain ভাগ করে—তাই আধুনিক LAN-এ hub প্রায় ব্যবহার হয় না।`
          : run.destinationKnown
            ? "মাত্র একটি কপি নির্দিষ্ট port দিয়ে গেছে। CAM entry থাকা পর্যন্ত switch এভাবেই সরাসরি forward করবে; অনেকক্ষণ নীরব থাকলে entry aging হয়ে মুছে যেতে পারে।"
            : "প্রথমবার flooding হলেও reply থেকে switch প্রাপকের port শিখে নিয়েছে। এখন আবার একই Data পাঠালে শুধু প্রাপকের কাছেই যাবে।",
    };
  })();

  const eventLog = useMemo(() => {
    if (!run) return ["Frame তৈরি হয়নি—প্রেরক, প্রাপক ও Data ঠিক করে পাঠাও।"];
    const lines = [
      `${runSource.label} frame বানাল: Src ${runSource.mac} → Dst ${runDest.mac}; Data “${run.message}”`,
    ];
    if (phaseOrder >= 1) {
      lines.push(
        mode === "hub"
          ? "Hub signal পেল; MAC lookup নেই, CAM table নেই।"
          : `Switch শিখল: Source MAC ${runSource.mac} → P${runSource.port}`,
      );
    }
    if (phaseOrder >= 1 && mode === "switch") {
      lines.push(
        run.destinationKnown
          ? `CAM lookup hit: ${runDest.mac} → P${runDest.port}; শুধু ওই port-এ forward।`
          : `CAM lookup miss: ${runDest.mac} অজানা; source port বাদে flood।`,
      );
    }
    if (arrivesOriginal) {
      lines.push(`${runDest.label}: Destination MAC মিলেছে ✓ গ্রহণ।`);
      if (discardedCount > 0) lines.push(`আরও ${discardedCount}টি NIC: MAC মেলেনি ✕ বাতিল।`);
    }
    if (arrivesReply || phase === "learnReply") {
      lines.push(`Switch শিখল: Reply-র Source MAC ${runDest.mac} → P${runDest.port}`);
    }
    if (phase === "done") lines.push("যাত্রা শেষ। অন্য জোড়া বেছে আবার পরীক্ষা করো।");
    return lines;
  }, [arrivesOriginal, arrivesReply, discardedCount, mode, phase, phaseOrder, run, runDest, runSource]);

  const deviceState = (device: LanDevice) => {
    if (arrivesReply && device.id === run?.sourceId) return "accepted";
    if (!arrivesOriginal) return "idle";
    if (device.id === run?.destId) return "accepted";
    if (originalRecipients.some((recipient) => recipient.id === device.id)) return "discarded";
    return "none";
  };

  const linkActive = (device: LanDevice) => {
    if (!run) return false;
    if (phase === "toCenter" || phase === "decide") return device.id === run.sourceId;
    if (phase === "forward" || phase === "verdict") return originalRecipients.some((d) => d.id === device.id);
    if (phase === "replyToCenter" || phase === "learnReply") return device.id === run.destId;
    if (phase === "replyForward" || phase === "replyVerdict") return device.id === run.sourceId;
    return device.id === run.sourceId || device.id === run.destId;
  };

  const renderPackets = () => {
    if (!run || phase === "idle" || phase === "done") return null;
    if (phase === "toCenter") {
      const point = pointBetween(trimPacketStart(runSource), centerPortPoint(runSource), progress);
      return <PacketChip {...point} destinationMac={runDest.mac} data={run.message} />;
    }
    if (phase === "decide") {
      return <PacketChip x={LAN_CENTER.x} y={LAN_CENTER.y - 84} destinationMac={runDest.mac} data={run.message} />;
    }
    if (phase === "forward" || phase === "verdict") {
      return originalRecipients.map((device) => {
        const point = pointBetween(
          centerPortPoint(device),
          trimPacketEnd(device),
          phase === "verdict" ? 1 : progress,
        );
        return (
          <PacketChip
            key={device.id}
            {...point}
            destinationMac={runDest.mac}
            data={run.message}
            tone={device.id === run.destId ? "cyan" : "violet"}
          />
        );
      });
    }
    if (phase === "replyToCenter") {
      const point = pointBetween(trimPacketStart(runDest), centerPortPoint(runDest), progress);
      return <PacketChip {...point} destinationMac={runSource.mac} data="Reply: পেয়েছি" tone="violet" />;
    }
    if (phase === "learnReply") {
      return <PacketChip x={LAN_CENTER.x} y={LAN_CENTER.y - 84} destinationMac={runSource.mac} data="Reply: পেয়েছি" tone="violet" />;
    }
    if (phase === "replyForward" || phase === "replyVerdict") {
      const point = pointBetween(
        centerPortPoint(runSource),
        trimPacketEnd(runSource),
        phase === "replyVerdict" ? 1 : progress,
      );
      return <PacketChip {...point} destinationMac={runSource.mac} data="Reply: পেয়েছি" tone="violet" />;
    }
    return null;
  };

  const selectClass =
    "bangla w-full rounded-xl border border-white/12 bg-[#0b1526] px-3 py-2.5 text-[13px] text-ink outline-none transition-colors focus:border-signal/70";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/12 bg-[#070d18] p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-signal">
              {mode === "hub" ? "HUB · LAYER 1 · REPEAT TO EVERYONE" : "SWITCH · LAYER 2 · LEARN + FORWARD"}
            </p>
            <h3 className="bangla mt-1.5 text-[17px] font-semibold text-white">
              {mode === "hub" ? "১০টি ডিভাইস, একটি Hub—সবার কাছে কপি" : "১০টি ডিভাইস, একটি Switch—ঠিকানা শিখে নির্দিষ্ট port"}
            </h3>
            <p className="bangla mt-1 max-w-3xl text-[12px] leading-relaxed text-muted">
              প্রতিটি বাস্তবধর্মী ল্যাপটপ/পিসির নিচে তার NIC-এর MAC address দেওয়া আছে। ডিভাইসে ক্লিক করেও
              প্রেরক ও প্রাপক বাছাই করা যায়।
            </p>
          </div>
          <span className="bangla inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10.5px] text-faint">
            <MousePointerClick size={12} className="text-signal" />
            {clickTarget === "source" ? "এবার ক্লিক: প্রেরক" : "এবার ক্লিক: প্রাপক"}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.35fr_auto]">
          <label className="bangla block text-[12px] text-muted" htmlFor={`${mode}-source`}>
            প্রেরক (Source)
            <select id={`${mode}-source`} className={cn(selectClass, "mt-1.5")} value={sourceId} onChange={(e) => changeSource(e.target.value)}>
              {LAN_DEVICES.map((device) => (
                <option key={device.id} value={device.id}>
                  P{device.port} · {device.label} — {device.name} · {device.mac}
                </option>
              ))}
            </select>
          </label>
          <label className="bangla block text-[12px] text-muted" htmlFor={`${mode}-dest`}>
            প্রাপক (Destination)
            <select id={`${mode}-dest`} className={cn(selectClass, "mt-1.5")} value={destId} onChange={(e) => changeDest(e.target.value)}>
              {LAN_DEVICES.map((device) => (
                <option key={device.id} value={device.id}>
                  P{device.port} · {device.label} — {device.name} · {device.mac}
                </option>
              ))}
            </select>
          </label>
          <label className="bangla block text-[12px] text-muted" htmlFor={`${mode}-data`}>
            Frame-এর Data / Payload
            <input
              id={`${mode}-data`}
              className={cn(selectClass, "mt-1.5")}
              value={message}
              maxLength={42}
              onChange={(e) => {
                setMessage(e.target.value);
                resetRun();
              }}
              placeholder="যেমন: নোট ফাইলটি পাঠাও"
            />
          </label>
          <div className="flex items-end">
            <ChoiceGroup
              label="গতি"
              value={String(speed)}
              onChange={(value) => setSpeed(Number(value))}
              options={[
                { id: "0.5", label: "০.৫×" },
                { id: "1", label: "১×" },
                { id: "2", label: "২×" },
              ]}
              size="sm"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={startRun} disabled={Boolean(run && phase !== "done")} icon={<Send size={14} />}>
            {mode === "hub" ? "Hub দিয়ে Data পাঠাও" : "Switch দিয়ে Data পাঠাও"}
          </Button>
          <Button
            onClick={() => setPlaying((value) => !value)}
            disabled={!run || phase === "done"}
            ariaLabel={`${mode === "hub" ? "Hub" : "Switch"} সিমুলেশন ${playing ? "থামাও" : "চালু করো"}`}
            icon={playing ? <Pause size={14} /> : <Play size={14} />}
          >
            {playing ? "থামাও" : "চালু করো"}
          </Button>
          <Button
            onClick={nextPhase}
            disabled={!run || phase === "done"}
            ariaLabel={`${mode === "hub" ? "Hub" : "Switch"} সিমুলেশনের পরের ধাপ`}
            icon={<SkipForward size={14} />}
          >
            পরের ধাপ
          </Button>
          <Button onClick={randomPair} icon={<Shuffle size={14} />}>এলোমেলো জোড়া</Button>
          <Button onClick={resetRun} icon={<RotateCcw size={14} />}>অ্যানিমেশন রিসেট</Button>
          <ChoiceGroup
            label="ডায়াগ্রামে ক্লিকের কাজ"
            value={clickTarget}
            onChange={(value) => setClickTarget(value as "source" | "dest")}
            options={[
              { id: "source", label: "প্রেরক বাছাই" },
              { id: "dest", label: "প্রাপক বাছাই" },
            ]}
            size="sm"
            className="ml-auto"
          />
        </div>

        {mode === "switch" && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.07] pt-3">
            <Button
              onClick={() => {
                resetRun();
                setCam({});
                setLastLearnedId(null);
                setLearnAllActive(false);
              }}
              variant="danger"
              icon={<Eraser size={14} />}
            >
              CAM table মুছে ফেলো
            </Button>
            <Button
              onClick={() => {
                resetRun();
                setLearnAllActive((value) => !value);
              }}
              disabled={Object.keys(cam).length >= LAN_DEVICES.length && !learnAllActive}
              icon={<GraduationCap size={14} />}
            >
              {learnAllActive ? "শেখানো থামাও" : "সবাইকে hello বলিয়ে Switch-কে শেখাও"}
            </Button>
            <span className="bangla self-center text-[11px] text-faint">
              CAM-এ শেখা আছে {Object.keys(cam).length}/১০টি MAC
            </span>
          </div>
        )}
      </div>

      <figure className="net-figure net-figure--wide" aria-label={`${mode === "hub" ? "Hub" : "Switch"} দিয়ে ১০টি ডিভাইসে Data পাঠানোর সিমুলেশন`}>
        <svg viewBox="0 0 1000 520" role="img" aria-labelledby={`${mode}-svg-title ${mode}-svg-described`}>
          <title id={`${mode}-svg-title`}>
            {mode === "hub" ? "Hub সব ডিভাইসে frame repeat করছে" : "Switch MAC table দেখে frame forward করছে"}
          </title>
          <desc id={`${mode}-svg-described`}>
            বামে পাঁচটি ও ডানে পাঁচটি ল্যাপটপ এবং ডেস্কটপ, মাঝখানে {mode === "hub" ? "Hub" : "Switch"}। প্রতিটি ডিভাইসের MAC address দেখানো হয়েছে।
          </desc>
          {Array.from({ length: 17 }, (_, x) =>
            Array.from({ length: 9 }, (_, y) => (
              <circle key={`${x}-${y}`} cx={34 + x * 58} cy={28 + y * 58} r={1.1} fill="#8b9bb9" opacity={0.13} />
            )),
          )}

          {LAN_DEVICES.map((device) => {
            const end = centerPortPoint(device);
            const start = trimPacketStart(device);
            const active = linkActive(device);
            return (
              <g key={`link-${device.id}`}>
                <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={active ? "#3ddbd9" : "#49627f"} strokeWidth={active ? 2.7 : 1.5} opacity={active ? 0.92 : 0.48} />
                {active && playing && (
                  <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} className="net-flow" stroke="#a5f3fc" strokeWidth={1.1} opacity={0.8} />
                )}
                <text
                  x={(start.x + end.x) / 2}
                  y={(start.y + end.y) / 2 - 5}
                  textAnchor="middle"
                  className="net-mono"
                  fontSize={7.5}
                  fill={active ? "#7ee7e2" : "#697b98"}
                >
                  P{device.port}
                </text>
              </g>
            );
          })}

          <g>
            <rect x={LAN_CENTER.x - 112} y={LAN_CENTER.y - 58} width={224} height={116} rx={18} fill="#0a1730" stroke={phase === "decide" || phase === "learnReply" ? "#fbbf24" : "#3ddbd9"} strokeWidth={2} />
            <rect x={LAN_CENTER.x - 92} y={LAN_CENTER.y - 43} width={184} height={34} rx={9} fill="#071326" stroke="#243b5d" />
            <text x={LAN_CENTER.x} y={LAN_CENTER.y - 25} textAnchor="middle" fontSize={16} fontWeight={700} fill="#fff">
              {mode === "hub" ? "ETHERNET HUB" : "ETHERNET SWITCH"}
            </text>
            <text x={LAN_CENTER.x} y={LAN_CENTER.y - 12} textAnchor="middle" className="net-mono" fontSize={7.5} fill="#7ee7e2">
              {mode === "hub" ? "LAYER 1 · NO MAC TABLE" : "LAYER 2 · CAM / MAC TABLE"}
            </text>
            {LAN_DEVICES.map((device) => {
              const column = device.port <= 5 ? device.port - 1 : device.port - 6;
              const row = device.port <= 5 ? 0 : 1;
              const x = LAN_CENTER.x - 76 + column * 38;
              const y = LAN_CENTER.y + 8 + row * 28;
              const active = linkActive(device);
              return (
                <g key={`port-${device.id}`}>
                  <rect x={x - 14} y={y - 9} width={28} height={18} rx={3} fill={active ? "#123c42" : "#0b1a2e"} stroke={active ? "#3ddbd9" : "#385173"} />
                  <circle cx={x - 8} cy={y} r={2.2} fill={active ? "#34d399" : "#50637e"} className={active && playing ? "cs-blink" : undefined} />
                  <text x={x + 4} y={y + 3} textAnchor="middle" className="net-mono" fontSize={7} fill="#cfe9ff">{device.port}</text>
                </g>
              );
            })}
            <text x={LAN_CENTER.x} y={LAN_CENTER.y + 78} textAnchor="middle" fontSize={10} fill="#8b9bb9">
              {mode === "hub" ? "signal repeat · সব port" : "learn · lookup · forward/filter"}
            </text>
          </g>

          {renderPackets()}

          {LAN_DEVICES.map((device) => {
            const state = deviceState(device);
            const selectedSource = device.id === sourceId;
            const selectedDest = device.id === destId;
            const stroke = state === "accepted" ? "#34d399" : state === "discarded" ? "#f87171" : selectedSource ? "#3ddbd9" : selectedDest ? "#fbbf24" : "#3c587c";
            return (
              <g
                key={device.id}
                role="button"
                tabIndex={0}
                aria-label={`${device.label}, ${device.name}, MAC ${device.mac}—${clickTarget === "source" ? "প্রেরক" : "প্রাপক"} হিসেবে বাছাই করো`}
                aria-pressed={selectedSource || selectedDest}
                className="net-clickable"
                onClick={() => pickDevice(device.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    pickDevice(device.id);
                  }
                }}
              >
                <rect
                  className="net-node-box net-focus-ring"
                  x={device.x - 80}
                  y={device.y - 36}
                  width={160}
                  height={72}
                  rx={14}
                  fill={state === "accepted" ? "#0b2d25" : state === "discarded" ? "#321a22" : "#0a1528"}
                  stroke={stroke}
                  strokeWidth={selectedSource || selectedDest || state !== "idle" ? 2 : 1.2}
                />
                <DeviceGlyph device={device} active={selectedSource || selectedDest || state === "accepted"} />
                <text x={device.x - 34} y={device.y - 15} fontSize={11} fontWeight={700} fill="#fff">
                  {device.label} · {device.kind === "laptop" ? "ল্যাপটপ" : "ডেস্কটপ"}
                </text>
                <text x={device.x - 34} y={device.y + 1} fontSize={9.5} fill="#9fb2cf">{device.name}</text>
                <text x={device.x - 34} y={device.y + 17} className="net-mono" fontSize={7.1} fill="#7ee7e2">MAC {device.mac}</text>
                <text x={device.x - 34} y={device.y + 29} className="net-mono" fontSize={6.8} fill="#697b98">NIC · PORT P{device.port}</text>
                {selectedSource && (
                  <g>
                    <rect x={device.x + 42} y={device.y - 50} width={48} height={17} rx={8.5} fill="#0d3f46" stroke="#3ddbd9" />
                    <text x={device.x + 66} y={device.y - 38} textAnchor="middle" fontSize={8.5} fill="#a5f3fc">প্রেরক</text>
                  </g>
                )}
                {selectedDest && (
                  <g>
                    <rect x={device.x + 42} y={device.y - 50} width={48} height={17} rx={8.5} fill="#42320a" stroke="#fbbf24" />
                    <text x={device.x + 66} y={device.y - 38} textAnchor="middle" fontSize={8.5} fill="#fde68a">প্রাপক</text>
                  </g>
                )}
                {state === "accepted" && (
                  <text x={device.x} y={device.y + 51} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="#34d399">✓ MAC মিলেছে—গ্রহণ</text>
                )}
                {state === "discarded" && (
                  <text x={device.x} y={device.y + 51} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="#f87171">✕ MAC মেলেনি—বাতিল</text>
                )}
                {state === "none" && mode === "switch" && (
                  <text x={device.x} y={device.y + 51} textAnchor="middle" fontSize={9} fill="#697b98">কোনো কপি পায়নি</text>
                )}
                {lastLearnedId === device.id && mode === "switch" && (
                  <circle cx={device.x} cy={device.y} r={48} fill="none" stroke="#fbbf24" strokeWidth={1.4} className="net-ping" />
                )}
              </g>
            );
          })}
        </svg>
      </figure>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-white/12 bg-white/[0.025] p-4" aria-label="Ethernet frame inspector">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="bangla text-[13.5px] font-semibold text-white">চলমান Ethernet frame</h4>
              <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-signal">
                {run ? `Phase ${Math.min(phaseIndex + 1, phases.length)}/${phases.length} · ${phase}` : "Preview"}
              </span>
            </div>
            <div className="mt-3 grid overflow-hidden rounded-xl border border-white/12 text-center sm:grid-cols-[1.3fr_1.3fr_0.55fr_1.45fr_0.55fr]">
              {[
                { label: "Destination MAC", value: frameDest.mac, sub: `${frameDest.label} · P${frameDest.port}`, tone: "text-amber-200" },
                { label: "Source MAC", value: frameSource.mac, sub: `${frameSource.label} · P${frameSource.port}`, tone: "text-cyan-200" },
                { label: "Type", value: "0x0800", sub: "IPv4", tone: "text-ink" },
                { label: "Data / Payload", value: frameData || "—", sub: "যা পাঠানো হচ্ছে", tone: "text-white" },
                { label: "FCS", value: "CRC", sub: "error check", tone: "text-ink" },
              ].map((field, index) => (
                <div key={field.label} className={cn("min-w-0 bg-[#081120] px-3 py-3", index > 0 && "border-t border-white/10 sm:border-l sm:border-t-0")}>
                  <p className="font-mono text-[7.5px] uppercase tracking-[0.12em] text-faint">{field.label}</p>
                  <p className={cn("mt-1.5 break-words font-mono text-[10.5px] leading-snug", field.tone)}>{field.value}</p>
                  <p className="bangla mt-1 text-[9.5px] text-faint">{field.sub}</p>
                </div>
              ))}
            </div>
            {run && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]" aria-hidden>
                <div className="h-full rounded-full bg-signal transition-[width] duration-100" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            )}
          </section>

          <section id={`${mode}-status`} className="rounded-2xl border border-signal/25 bg-signal/[0.055] p-4" aria-live="polite">
            <h4 className="bangla text-[14px] font-semibold text-white">{status.title}</h4>
            <p className="bangla mt-1.5 text-[12.5px] leading-relaxed text-muted">{status.body}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "কেন্দ্র থেকে কপি", value: `${copiesSent}` },
                { label: "গ্রহণ করেছে", value: `${acceptedCount}` },
                { label: "MAC মিলে বাতিল", value: `${discardedCount}` },
                { label: "অপ্রয়োজনীয় কপি", value: `${unnecessaryCopies}` },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-white/10 bg-[#071120] px-3 py-2.5 text-center">
                  <p className="bangla text-[18px] font-semibold leading-none text-white">{stat.value}</p>
                  <p className="bangla mt-1.5 text-[10px] text-faint">{stat.label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4" aria-label="ঘটনার লগ">
            <h4 className="bangla font-mono text-[9px] uppercase tracking-[0.16em] text-faint">Frame event log</h4>
            <ol className="mt-2.5 space-y-1.5">
              {eventLog.map((line, index) => (
                <li key={`${line}-${index}`} className="bangla flex gap-2 text-[11.5px] leading-relaxed text-muted">
                  <span className="font-mono text-[9px] text-signal">{String(index + 1).padStart(2, "0")}</span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {mode === "hub" ? (
          <section className="h-fit rounded-2xl border border-[#f87171]/25 bg-[#f87171]/[0.055] p-4" aria-label="Hub-এর কোনো MAC table নেই">
            <p className="bangla flex items-center gap-2 text-[13.5px] font-semibold text-white">
              <XCircle size={16} className="text-[#f87171]" /> Hub-এর কোনো MAC table নেই
            </p>
            <p className="bangla mt-2 text-[12.5px] leading-relaxed text-muted">
              Hub জানে না কোন MAC কোন port-এ আছে। তাই frame-এর গন্তব্য যেই হোক, সে সবসময় একই কাজ করে:
              আসা electrical signal বাকি সব port-এ repeat করে দেয়। সিদ্ধান্ত নেয় প্রতিটি ডিভাইসের NIC—
              Destination MAC নিজের MAC-এর সঙ্গে মিললে গ্রহণ, না মিললে বাতিল।
            </p>
            <ul className="bangla mt-3 space-y-2 text-[12px] leading-relaxed text-muted">
              <li className="flex gap-2"><span className="mt-[0.65em] h-1 w-1 shrink-0 rounded-full bg-[#f87171]" />সবাই সবার frame শুনতে পায়—গোপনীয়তা ও bandwidth দুই দিকেই ক্ষতি।</li>
              <li className="flex gap-2"><span className="mt-[0.65em] h-1 w-1 shrink-0 rounded-full bg-[#f87171]" />দুটো ডিভাইস একসঙ্গে পাঠালে collision হতে পারে; পুরো hub একটি collision domain।</li>
              <li className="flex gap-2"><span className="mt-[0.65em] h-1 w-1 shrink-0 rounded-full bg-[#f87171]" />এই কারণেই আধুনিক LAN-এ hub-এর জায়গা নিয়েছে switch।</li>
            </ul>
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.025]" aria-label="Switch CAM MAC address table">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] p-4">
              <h4 className="bangla flex items-center gap-2 text-[13.5px] font-semibold text-white">
                <TableProperties size={16} className="text-signal" /> Switch-এর CAM / MAC Address Table
              </h4>
              <span className="font-mono text-[8.5px] uppercase tracking-[0.13em] text-faint">{Object.keys(cam).length}/10 learned</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.08] text-faint">
                    <th className="bangla px-3 py-2.5 text-[10.5px] font-normal">Port</th>
                    <th className="bangla px-3 py-2.5 text-[10.5px] font-normal">Device</th>
                    <th className="bangla px-3 py-2.5 text-[10.5px] font-normal">সংরক্ষিত MAC Address</th>
                    <th className="bangla px-3 py-2.5 text-[10.5px] font-normal">কীভাবে শিখল</th>
                    <th className="bangla px-3 py-2.5 text-[10.5px] font-normal">অবস্থা</th>
                  </tr>
                </thead>
                <tbody>
                  {LAN_DEVICES.map((device) => {
                    const entry = cam[device.id];
                    const lookupTarget = run && phase === "decide" && device.id === run.destId;
                    const justLearned = lastLearnedId === device.id && Boolean(entry);
                    return (
                      <tr
                        key={device.id}
                        className={cn(
                          "border-b border-white/[0.05] transition-colors",
                          justLearned && "bg-warn/[0.09]",
                          lookupTarget && (entry ? "bg-emerald-400/[0.08]" : "bg-[#f87171]/[0.08]"),
                        )}
                      >
                        <td className="px-3 py-2 font-mono text-[10.5px] text-signal">P{device.port}</td>
                        <td className="bangla px-3 py-2 text-[11px] text-ink">{device.label} · {device.name}</td>
                        <td className="px-3 py-2 font-mono text-[10px] text-cyan-100">{entry ? device.mac : "— এখনো শেখেনি —"}</td>
                        <td className="bangla px-3 py-2 text-[10.5px] text-muted">{entry?.learnedBy ?? "ওই ডিভাইস এখনো frame পাঠায়নি"}</td>
                        <td className="bangla px-3 py-2 text-[10.5px]">
                          {entry ? (
                            <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 size={12} /> Learned #{entry.order}</span>
                          ) : lookupTarget ? (
                            <span className="inline-flex items-center gap-1 text-[#fca5a5]"><XCircle size={12} /> Lookup miss</span>
                          ) : (
                            <span className="text-faint">Empty</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="bangla flex gap-2 border-t border-white/[0.07] p-3.5 text-[11px] leading-relaxed text-faint">
              <Database size={14} className="mt-0.5 shrink-0 text-signal" />
              মূল নিয়ম: কোনো port দিয়ে frame এলে switch ওই frame-এর <strong className="text-ink">Source MAC → আসা port</strong>
              সংরক্ষণ করে। পরে Destination MAC হিসেবে ওই MAC এলে সংরক্ষিত port দিয়েই পাঠানো হয়।
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

export function HubSimulation() {
  return <LanSimulation mode="hub" />;
}

export function SwitchSimulation() {
  return <LanSimulation mode="switch" />;
}
