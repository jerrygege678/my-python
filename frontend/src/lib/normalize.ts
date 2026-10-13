import type { NormalizeOptions } from "../types";

export function normalize(s: string, opts: NormalizeOptions = {}): string {
  const {
    ignoreTrailingWhitespace = true,
    ignoreTrailingBlankLines = true,
    ignoreCase = false,
    collapseSpaces = false,
  } = opts;
  let out = (s ?? "").replace(/\r\n?/g, "\n");
  let lines = out.split("\n");
  if (ignoreTrailingWhitespace) lines = lines.map((l) => l.replace(/[ \t]+$/g, ""));
  if (ignoreTrailingBlankLines) while (lines.length && lines[lines.length - 1] === "") lines.pop();
  out = lines.join("\n");
  if (collapseSpaces) out = out.replace(/[ \t]+/g, " ");
  if (ignoreCase) out = out.toLowerCase();
  return out;
}
