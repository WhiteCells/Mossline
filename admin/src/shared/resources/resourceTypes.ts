import type { EntityId } from "../types/content";

export type FormValue = string | number | boolean;
export type FormRecord = Record<string, FormValue>;

export interface ManagedResource {
  id: EntityId;
  name: string;
  activate?: boolean;
  sort?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface ResourceField {
  name: string;
  label: string;
  type?:
    | "text"
    | "url"
    | "email"
    | "number"
    | "textarea"
    | "select"
    | "checkbox";
  required?: boolean;
  placeholder?: string;
  hint?: string;
  full?: boolean;
  options?: Array<{ value: string; label: string }>;
  validate?: (value: FormValue, values: FormRecord) => string | undefined;
}
