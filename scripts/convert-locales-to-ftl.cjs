#!/usr/bin/env node
/*
 * One-shot converter: telegraf-i18n YAML locales -> Fluent (.ftl) for
 * @grammyjs/i18n.
 *
 * Usage:
 *   node scripts/convert-locales-to-ftl.cjs            # all locales
 *   node scripts/convert-locales-to-ftl.cjs uk de fr   # only these
 *
 * Rules:
 *   - Nested keys flatten with '-' (Fluent ids forbid dots):
 *       image_to_quote.errors.no_image -> image_to_quote-errors-no_image
 *   - ${var} and {var} -> { $var }   (both syntaxes appear in the locales)
 *   - Literal { } in text are escaped as Fluent string literals.
 *   - Multiline values use Fluent block syntax (4-space indent; blank lines kept).
 *
 * After writing each file it validates by loading the .ftl into a FluentBundle
 * (useIsolating:false) and asserting every source key resolves to a message.
 */
const fs = require('node:fs')
const path = require('node:path')
const YAML = require('yaml')
const { FluentBundle, FluentResource } = require('@fluent/bundle')

const SRC_DIR = path.resolve(__dirname, '..', 'locales')
const OUT_DIR = path.resolve(__dirname, '..', 'src', 'i18n', 'locales')

/** Recursively flatten a nested object into { 'a-b-c': value } leaves. */
function flatten(obj, prefix, out) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}-${k}` : k
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      flatten(v, key, out)
    } else {
      out[key] = String(v)
    }
  }
  return out
}

/** Convert a raw YAML string value into a Fluent pattern body. */
function toFluentPattern(raw) {
  const tokens = []
  const protect = (name) => ` ${tokens.push(name) - 1} `

  // 1. Protect both variable syntaxes used across the locales:
  //    ${var} (telegraf-i18n) and {var} (a few aimode keys).
  let text = raw
    .replace(/\$\{(\w+)\}/g, (_m, name) => protect(name))
    .replace(/\{\s*(\w+)\s*\}/g, (_m, name) => protect(name))

  // 2. Escape any remaining literal braces as Fluent string literals.
  text = text.replace(/\{/g, '{"{"}').replace(/\}/g, '{"}"}')

  // 3. Restore protected vars as Fluent placeables.
  text = text.replace(/ (\d+) /g, (_m, i) => `{ $${tokens[Number(i)]} }`)

  return text
}

/** Render `key = ...` (single- or multi-line) in Fluent syntax. */
function renderEntry(key, raw) {
  const pattern = toFluentPattern(raw).replace(/\s+$/, '') // drop trailing whitespace/newlines

  if (!pattern.includes('\n')) {
    return `${key} = ${pattern}\n`
  }

  const body = pattern
    .split('\n')
    .map((line) => (line.length ? `    ${line}` : ''))
    .join('\n')
  return `${key} =\n${body}\n`
}

function convert(lang) {
  const srcPath = path.join(SRC_DIR, `${lang}.yaml`)
  const data = YAML.parse(fs.readFileSync(srcPath, 'utf8'))
  const flat = flatten(data, '', {})

  let ftl = `# Auto-generated from locales/${lang}.yaml — do not edit by hand.\n# Regenerate: node scripts/convert-locales-to-ftl.cjs ${lang}\n\n`
  for (const [key, value] of Object.entries(flat)) {
    ftl += renderEntry(key, value)
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(path.join(OUT_DIR, `${lang}.ftl`), ftl)

  // Validate: every source key must resolve in the bundle.
  const bundle = new FluentBundle(lang, { useIsolating: false })
  const errors = bundle.addResource(new FluentResource(ftl))
  const missing = Object.keys(flat).filter((k) => !bundle.hasMessage(k))

  return { lang, keys: Object.keys(flat).length, missing, errors: errors.map(String) }
}

const langs =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2)
    : fs
        .readdirSync(SRC_DIR)
        .filter((f) => f.endsWith('.yaml'))
        .map((f) => f.replace(/\.yaml$/, ''))

let failed = false
for (const lang of langs) {
  const r = convert(lang)
  const ok = r.missing.length === 0 && r.errors.length === 0
  if (!ok) failed = true
  console.log(
    `${ok ? '✓' : '✗'} ${r.lang}: ${r.keys} keys` +
      (r.missing.length ? `, MISSING ${r.missing.length}: ${r.missing.slice(0, 5).join(', ')}` : '') +
      (r.errors.length ? `, ERRORS: ${r.errors.slice(0, 3).join(' | ')}` : ''),
  )
}
process.exit(failed ? 1 : 0)
