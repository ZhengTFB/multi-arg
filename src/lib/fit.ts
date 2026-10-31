export const FRAME_W = 430
export const FRAME_H = 932

/** 容器固定 430×932，等比缩放到可用高度。宽度不随面板收放变化。 */
export function computeScale(availW: number, availH: number): number {
  if (availW <= 0 || availH <= 0) return 1
  return Math.min(availH / FRAME_H, availW / FRAME_W)
}
