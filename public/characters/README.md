# /public/characters

Optional raster or SVG overrides for the cast: `kiddo`, `foxy`, `bibi`, `pip`,
`wally`.

This folder is empty on purpose. The production artwork is the vector rig in
`src/components/character`, which `<CharacterFigure>` draws by default — see
`/character` for the specification. A file here only ever *replaces* the rig for
one character, and that character then loses its poses and expressions, so do it
only when a drawing genuinely cannot be expressed by the rig.

To override a character:

1. Add the file here, e.g. `foxy.svg` (`.png` and `.webp` also work).
2. Fill in `art` for that character in `src/data/characters.ts`:
   `art: { src: "/characters/foxy.svg", width: 512, height: 512 }`

Nothing else needs to change — every screen picks it up.

Square artwork, transparent background, roughly 512×512 for raster formats.
