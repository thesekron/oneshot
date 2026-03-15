// OneShot terminal logo
// Rendered using Unicode block characters + ANSI escape codes
// Inspired by the OneShot SVG: a ring/circle with two diagonal cuts

const R = "\x1b[0m"          // reset
const W = "\x1b[97m"         // bright white  (ring)
const D = "\x1b[90m"         // dark gray      (background / cuts)
const C = "\x1b[96m"         // cyan           (accent)
const B = "\x1b[1m"          // bold

// The ring symbol — 6 rows, matches the text height
// ▄ = lower half block, ▀ = upper half block, █ = full block
const ring = [
  `  ${D}▄${W}███${D}▄${R}  `,
  ` ${D}█${W}█${D}   ${W}█${D}█${R} `,
  ` ${W}█${D}  ${W}█${D}  ${W}█${R} `,
  ` ${D}█${W}█${D}   ${W}█${D}█${R} `,
  `  ${D}▀${W}███${D}▀${R}  `,
  `           `,
]

// "ONESHOT" in block letters — each letter is 6 chars wide, 5 rows tall
// Using a compact double-line box style
const text = [
  ` ${B}${W}█▀▀█ █▄ █ █▀▀ █▀▀ █ █ █▀▀█ ▀█▀${R}`,
  ` ${B}${W}█  █ █ ██ █▀▀ ▀▀█ █▀█ █  █  █ ${R}`,
  ` ${B}${W}▀▀▀▀ ▀  ▀ ▀▀▀ ▀▀▀ ▀ ▀ ▀▀▀▀  ▀ ${R}`,
]

const tagline = `  ${D}AI-powered whiteboard for developers${R}`

export function printLogo(version: string) {
  process.stdout.write("\n")

  // Row 0: top of ring + padding + top of text
  process.stdout.write(ring[0] + `  ` + text[0] + "\n")
  process.stdout.write(ring[1] + `  ` + text[1] + "\n")
  process.stdout.write(ring[2] + `  ` + text[2] + "\n")
  process.stdout.write(ring[3] + `  ` + `  ${D}v${version}${R}` + "\n")
  process.stdout.write(ring[4] + `  ` + tagline + "\n")
  process.stdout.write("\n")
}

// Small inline logo for non-banner contexts
export function inlineLogo(): string {
  return `${C}◉${R} ${B}${W}OneShot${R}`
}
