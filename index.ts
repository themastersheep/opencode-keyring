import type { Plugin } from "@opencode-ai/plugin"

async function lookupSecret($: Bun.$, value: string): Promise<string> {
  const match = /^\{keyring:([^{}]+)\}$/.exec(value)
  if (!match) return value

  const out = await $`secret-tool lookup ${match[1].trim().split(/\s+/)}`.quiet().nothrow()
  if (out.exitCode !== 0) {
    const stderr = out.stderr.toString().split("\n")[0].trim()
    throw new Error(`keyring lookup failed (exit ${out.exitCode}${stderr ? `, ${stderr}` : ""}): ${value}`)
  }

  const secret = out.text().trim()
  if (!secret) throw new Error(`keyring lookup returned no value: ${value}`)

  return secret
}

async function resolveSecrets($: Bun.$, value: unknown): Promise<unknown> {
  if (typeof value === "string") return lookupSecret($, value)
  if (Array.isArray(value)) return Promise.all(value.map((item) => resolveSecrets($, item)))
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>
    await Promise.all(
      Object.entries(object).map(async ([key, item]) => {
        object[key] = await resolveSecrets($, item)
      }),
    )
  }
  return value
}

export default (async ({ $ }) => ({
  config: (cfg) => resolveSecrets($, cfg),
})) satisfies Plugin
