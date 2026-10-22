/** 在接口边界收窄未知 JSON，避免读取空值或数组的字段 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
