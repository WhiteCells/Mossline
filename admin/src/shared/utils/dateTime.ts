function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** 将接口时间转换为浏览器本地时区的 datetime-local 输入值 */
export function apiDateTimeToLocalInput(value?: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 将本地时间输入转换为接口使用的 UTC 时间，空值或无效时间返回 null */
export function localInputToApiDateTime(value?: string | null): string | null {
  if (!value?.trim()) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
