// npm run assets: turns what is in media/ into everything the site needs.
//   media/logo.svg (or .png/.webp/.jpg, square, 512px or larger) → every icon and the share image
//   media/<name>.jpg|png|webp|avif|tiff|gif → src/images/<name>-<width>.webp, and the <img> to paste
//   media/<name>.svg → src/images/<name>.svg, optimized
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { extname, join, parse, resolve } from 'node:path'
import sharp from 'sharp'
import { optimize } from 'svgo'
import { site } from './site-plugin.mjs'

const MEDIA = resolve('media')
const PUBLIC = resolve('src/public')
const IMAGES = resolve('src/images')
const WIDTHS = [640, 1024, 1600]
const MAX_BYTES = 240 * 1024
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }
const { background } = site.brand
const svg = file => optimize(readFileSync(file, 'utf-8'), { multipass: true }).data

const files = existsSync(MEDIA) ? readdirSync(MEDIA).filter(f => !f.startsWith('.') && f !== 'README.md') : []
const logoFile = files.find(f => parse(f).name === 'logo')
const source = logoFile ? join(MEDIA, logoFile) : join(PUBLIC, 'logo.svg')

const logo = size => sharp(source, { density: 600 }).resize(size, size, { fit: 'contain', background: TRANSPARENT }).png().toBuffer()
const onCanvas = async (width, height, logoSize) =>
  sharp({ create: { width, height, channels: 3, background } }).composite([{ input: await logo(logoSize), gravity: 'center' }]).png().toBuffer()

// An .ico is a directory of PNGs.
const ico = images => {
  const header = Buffer.alloc(6 + 16 * images.length)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = header.length
  images.forEach(([size, png], i) => {
    const entry = 6 + 16 * i
    header.writeUInt8(size, entry)
    header.writeUInt8(size, entry + 1)
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(png.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += png.length
  })
  return Buffer.concat([header, ...images.map(([, png]) => png)])
}

const small = await Promise.all([16, 32, 48].map(async size => [size, await logo(size)]))
const icons = {
  'favicon.ico': ico(small),
  'favicon-32.png': small[1][1],
  'apple-touch-icon.png': await onCanvas(180, 180, 144), // iOS draws transparency as black.
  'icon-192.png': await logo(192),
  'icon-512.png': await logo(512),
  'icon-maskable-512.png': await onCanvas(512, 512, 308), // Masks may crop all but the middle 60%.
  'og.png': await onCanvas(1200, 630, 300),
}
for (const [name, data] of Object.entries(icons)) writeFileSync(join(PUBLIC, name), data)

// The header logo: an SVG as it is, anything else as a small webp.
if (extname(source).toLowerCase() === '.svg') {
  if (logoFile) writeFileSync(join(PUBLIC, 'logo.svg'), svg(source))
} else {
  writeFileSync(join(PUBLIC, 'logo.webp'), await sharp(source).resize({ height: 128 }).webp({ quality: 90 }).toBuffer())
}

// Each width is compressed until it fits, so no image can fail the size check later.
const webp = async (file, width) => {
  for (let quality = 82; ; quality -= 8) {
    // effort 6 is the slowest and smallest encoding; smartSubsample keeps edges of strong colours sharp.
    const output = await sharp(file).rotate().resize({ width }).webp({ quality, effort: 6, smartSubsample: true }).toBuffer({ resolveWithObject: true })
    if (output.data.length <= MAX_BYTES || quality <= 42) return output
  }
}

rmSync(IMAGES, { recursive: true, force: true })
mkdirSync(IMAGES, { recursive: true })
for (const file of files.filter(f => f !== logoFile)) {
  const { name } = parse(file)
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error(`Rename media/${file}: lowercase letters, digits and dashes only`)
  const path = join(MEDIA, file)
  if (extname(file).toLowerCase() === '.svg') {
    const optimized = svg(path)
    writeFileSync(join(IMAGES, `${name}.svg`), optimized)
    const [, width = '', height = ''] = optimized.match(/viewBox="[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)"/) ?? []
    console.log(`<img src="/images/${name}.svg" width="${width}" height="${height}" alt="" />`)
    continue
  }
  const original = (await sharp(path).rotate().metadata()).width
  const widths = [...new Set([...WIDTHS.filter(w => w < original), Math.min(original, WIDTHS.at(-1))])].sort((a, b) => a - b)
  let largest
  for (const width of widths) {
    largest = await webp(path, width)
    writeFileSync(join(IMAGES, `${name}-${width}.webp`), largest.data)
  }
  const srcset = widths.map(w => `/images/${name}-${w}.webp ${w}w`).join(', ')
  console.log(`<img src="/images/${name}-${widths.at(-1)}.webp" srcset="${srcset}" sizes="100vw" width="${largest.info.width}" height="${largest.info.height}" alt="" />`)
}
console.log('Icons written. Paste each <img> above, then set alt, sizes, and loading="lazy" on all but the first image of the page.')
