import { href } from "./router";

/** Static hrefs for plain <a> elements (the router Link handles the rest). */
export const LINK = {
  home: href("/"),
  howItWorks: href("/how-it-works"),
  simulation: href("/simulation"),
  comparison: href("/comparison"),
  faq: href("/faq"),
};
