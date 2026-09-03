function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Convert an API timestamp into the browser-local value datetime-local expects. */
export function apiDateTimeToLocalInput(value?: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Convert a browser-local datetime-local value into the API's UTC format. */
export function localInputToApiDateTime(value?: string | null): string | null {
  if (!value?.trim()) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
