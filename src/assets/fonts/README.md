# Kalpurush

All Bengali text on the site uses **Kalpurush 0.258**, by Tanbin Islam Siyam,
developed under the Avro Font Development Project at OmicronLab.

## Downloaded source

- Upstream: https://github.com/potasiyam/Kalpurush
- Pinned commit: `212bef1414db954b9259f099c0fdbad5cd95a80e`
- Original file: `release/Kalpurush0.258ship.ttf`
- Download archive: https://codeload.github.com/potasiyam/Kalpurush/tar.gz/212bef1414db954b9259f099c0fdbad5cd95a80e
- `kalpurush.ttf` is the unchanged original (314,592 bytes).
- TTF SHA-256: `83613a03e53aad8337f2be9fb974409a23c1d99b3b4b494567ba9d156c492b01`
- `LICENSE.txt` is the upstream licence, included verbatim. The licence file
  declares the reserved font name Kalpurush; the embedded font metadata refers
  to SIL Open Font License 1.0. Both are preserved as supplied by the author.

## Web conversion

`kalpurush.woff2` is a lossless WOFF2 compression of the original TTF. No glyphs,
outlines, naming metadata or OpenType shaping tables were changed or removed.
The CSS uses this smaller file; the original TTF is kept for reference and
reproducible conversion. Both files are local, with no runtime CDN dependency.

Reproduce the web file with FontTools and Brotli installed:

```sh
fonttools ttLib.woff2 compress src/assets/fonts/kalpurush.ttf -o src/assets/fonts/kalpurush.woff2
```

The face is registered once in `src/index.css`. Its Unicode range covers the
word space (`U+0020`), the Bengali danda/double-danda (`U+0964–U+0965`), Bengali
(`U+0980–U+09FF`), zero-width joiners and the dotted circle. The danda and space
are included explicitly so Chromium does not render them as fallback boxes
beside Bengali glyphs. The face is first in the shared sans/monospace stacks and
in explicit Bengali text/SVG rules. Thus Bengali uses Kalpurush throughout the
site, while Latin letters keep the existing typefaces. The original release has
one regular weight; browsers synthesize bold where the interface requests it.
