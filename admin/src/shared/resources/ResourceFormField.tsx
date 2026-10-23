import { FieldLabel } from "../ui/FieldLabel";
import type { FormValue, ResourceField } from "./resourceTypes";

interface ResourceFormFieldProps {
  field: ResourceField;
  value: FormValue | undefined;
  error?: string;
  onChange: (value: FormValue) => void;
}

export function ResourceFormField({
  field,
  value,
  error,
  onChange,
}: ResourceFormFieldProps) {
  const id = `resource-${field.name}`;
  const textValue = String(value ?? "");

  function renderInput() {
    switch (field.type) {
      case "textarea":
        return (
          <textarea
            id={id}
            className="textarea"
            value={textValue}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={Boolean(error)}
          />
        );
      case "select":
        return (
          <select
            id={id}
            className="select"
            value={textValue}
            onChange={(event) => onChange(event.target.value)}
          >
            {field.options?.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case "checkbox":
        return (
          <label className="checkbox">
            <input
              id={id}
              type="checkbox"
              checked={Boolean(value)}
              onChange={(event) => onChange(event.target.checked)}
            />
            启用
          </label>
        );
      default:
        return (
          <input
            id={id}
            className="input"
            type={field.type ?? "text"}
            placeholder={field.placeholder}
            value={textValue}
            onChange={(event) =>
              onChange(
                field.type === "number"
                  ? Number(event.target.value)
                  : event.target.value,
              )
            }
            aria-invalid={Boolean(error)}
          />
        );
    }
  }

  return (
    <div className={`field ${field.full ? "field--full" : ""}`}>
      <FieldLabel htmlFor={id}>
        {field.label}
        {field.required && <span className="required">*</span>}
      </FieldLabel>
      {renderInput()}
      {error && <span className="field-error">{error}</span>}
      {field.hint && <span className="field-hint">{field.hint}</span>}
    </div>
  );
}
