import type { ComponentProps, ReactNode } from "react";

/** Field layout keeps domain-specific controls, labels and error associations intact. */
export function Field({ className = "", ...props }: ComponentProps<"div">) {
  return <div {...props} className={`form__field ${className}`} />;
}

export function FormSection({
  title,
  children,
  className = "",
  ...props
}: Omit<ComponentProps<"fieldset">, "title"> & { title: ReactNode }) {
  return (
    <fieldset {...props} className={`form-section ${className}`}>
      <legend className="form-section__title">{title}</legend>
      <div className="form-section__body">{children}</div>
    </fieldset>
  );
}
