# NIC — বাংলা ভিজ্যুয়াল গাইড

একটি মাত্র বিষয় নিয়ে তৈরি responsive শিক্ষামূলক ওয়েব পেজ: **Network Interface Card (NIC)**।

## যা আছে

- NIC-এর সহজ বাংলা সংজ্ঞা ও চারটি প্রধান কাজ।
- PCIe Ethernet NIC-এর বাস্তব ছবি।
- মাদারবোর্ডে integrated Ethernet controller, ল্যাপটপে M.2 Wi-Fi card এবং ট্যাবলেটে integrated wireless chip-এর বাস্তব ছবি।
- প্রতিটি ছবি বড় করে দেখার accessible lightbox এবং আসল উৎসের লিংক।
- ডাটা পাঠানো ও গ্রহণের চার ধাপের interactive flow; প্রতিটি ধাপে ক্লিক করা যায় অথবা play চালানো যায়।
- মোবাইল, ট্যাবলেট ও ডেস্কটপ layout, keyboard focus এবং reduced-motion support।

পুরোনো satellite simulation, অন্যান্য network lesson, quiz ও unrelated content সরিয়ে দেওয়া হয়েছে।

## Development

```bash
npm install
npm run dev       # http://localhost:3000 / Arena preview
npm run typecheck
npm run build     # production output: dist/
npm run preview
```

## Structure

```text
src/App.tsx             content, interactions and components
src/index.css           local fonts, responsive styling and motion
src/main.tsx            React entry
public/media/           four locally served hardware photographs
```

React, TypeScript, Vite, Lucide icons এবং locally bundled Hind Siliguri / Space Grotesk fonts ব্যবহার করা হয়েছে।

## Photo credits

ছবির আসল উৎস, photographer ও license পেজের footer-এ এবং প্রতিটি lightbox-এ দেওয়া আছে।

1. **Intel 82574L Gigabit Ethernet NIC, PCI Express x1** — Dsimic, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:An_Intel_82574L_Gigabit_Ethernet_NIC,_PCI_Express_x1_card.jpg), CC BY-SA 3.0. ওয়েব উপস্থাপনার জন্য crop/scale করা হয়েছে।
2. **Realtek RTL8101L Fast Ethernet Controller** — fuatse_tdkr, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Realtek_rtl8101l_fast_ethernet_controller.JPG), public domain. ওয়েব উপস্থাপনার জন্য crop/scale করা হয়েছে।
3. **Framework মাদারবোর্ডে M.2 Wi-Fi card** — [Framework Guides](https://guides.frame.work/Guide/Cooler+Master+Mainboard+Case+Quick+Start+Guide/166). শিক্ষামূলক উপস্থাপনায় উৎস উল্লেখসহ ব্যবহৃত; crop/scale করা হয়েছে।
4. **Samsung Galaxy Tab Broadcom BCM4329 wireless chip** — © Raimond Spekking, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Samsung_Galaxy_Tab_GT-P1000_-_motherboard_-_Broadcom_BCM4329HKUBG-8577.jpg), CC BY-SA 4.0. ওয়েব উপস্থাপনার জন্য crop/scale করা হয়েছে।
