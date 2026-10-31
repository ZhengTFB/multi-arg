import data from '../copy.json'

export type CopyKey = keyof typeof data

/** 界面文案全部走这张表，浏览器里的「文案校对」改的就是 copy.json。 */
export const copy = data as Record<string, string>

export function t(key: CopyKey): string {
  return copy[key] ?? key
}
