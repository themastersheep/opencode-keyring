# opencode-keyring

An [opencode](https://opencode.ai) plugin that resolves `{keyring:attribute value ...}` placeholders
in `opencode.json` from the freedesktop secret service (GNOME keyring) via `secret-tool`.

`{keyring:...}` is **not** native opencode syntax. The built-in substitutions are `{env:VAR}` and
`{file:path}`; this plugin adds a third convention that keeps secrets out of environment variables
(where they are visible to every process via `/proc/<pid>/environ`) and out of files entirely.

## Usage

```jsonc
{
  "providers": {
    "example": {
      "settings": {
        "apiKey": "{keyring:key1 value1}",
        // any attribute/value pairs secret-tool accepts:
        // "apiKey": "{keyring:service acme account someuser}"
      }
    }
  }
}
```

Install it like any other opencode plugin:

```bash
opencode plugin add github:themastersheep/opencode-keyring
```

The placeholder works anywhere in the config, including the v1 config shape
(`"provider": { ... "options": { "apiKey": ... } }`).

## How it works

- The `config` hook fires once per opencode startup; the plugin walks the merged config and
  substitutes every `{keyring:...}` string in place. Config lifetime is the cache — there is no
  separate memoization, mirroring how opencode resolves `{env:}`/`{file:}`.
- The placeholder body is split on whitespace and passed verbatim to `secret-tool lookup`;
  `secret-tool` itself validates that attributes/values come in pairs.
- The secret exists only in the keyring and in opencode process memory. It is never written to
  disk or to the process environment.

## Errors

Failures throw from the config hook. opencode logs them as
`plugin config hook failed` (see `~/.local/share/opencode/log/opencode.log`) and continues startup,
so a broken placeholder surfaces as an authentication failure from the provider. Check the log for
the precise cause, e.g.:

```
keyring lookup failed (exit 2, secret-tool: must specify attributes and values in pairs): {keyring:token}
keyring lookup returned no value: {keyring:token missing}
```

## Requirements

- Linux (freedesktop secret service) with `secret-tool` installed
- an unlocked keyring containing the referenced entries

## License

MIT — see [LICENSE](LICENSE).
