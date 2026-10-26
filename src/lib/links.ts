import { href } from "./router";

/** Static hrefs for plain <a> elements (the router Link handles the rest). */
export const LINK = {
  home: href("/"),
  howItWorks: href("/how-it-works"),
  explorer: href("/explorer"),
  numbers: href("/numbers"),
  faq: href("/faq"),
};
