export function formatString(template: string, replacements: Record<string, string>): string {
  return template.replace(/{(\w+)}/g, (match, key) => replacements[key] !== undefined ? replacements[key] : match)
}
