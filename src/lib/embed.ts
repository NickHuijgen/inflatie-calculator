/**
 * JSON for a `<script>` block. `set:html` writes the string verbatim, and
 * `JSON.stringify` leaves `<` alone, so a value containing `</script>` would
 * end the block early. Nothing in the CBS data can today -- periods and
 * numbers only -- which is exactly why it is worth escaping here rather than
 * relying on every future caller to check. `<` is valid JSON and parses
 * back to `<`.
 */
export function embedJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
