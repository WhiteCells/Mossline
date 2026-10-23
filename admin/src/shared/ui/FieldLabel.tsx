import type { LabelHTMLAttributes } from "react";

/** 保留字段名称关联，点击文字时不自动聚焦或打开控件。 */
export function FieldLabel(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} onClick={(event) => event.preventDefault()} />;
}
