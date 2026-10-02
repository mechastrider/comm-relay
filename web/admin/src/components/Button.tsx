import type { ComponentProps } from "react";

type Props = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "danger";
};

function variantClass(variant: Props["variant"]) {
  return variant === "primary" ? "btn-start" : variant === "danger" ? "btn-danger" : "";
}

/** Ordinary actions share geometry; emphasis only changes their color. */
export function Button({ variant = "secondary", className = "", ...props }: Props) {
  return <button {...props} className={`btn-physical ${variantClass(variant)} ${className}`} />;
}

/** The caller supplies the localized accessible name and hover/focus tooltip. */
export function IconButton({ variant = "secondary", className = "", ...props }: Props) {
  return <button {...props} className={`icon-btn ${variantClass(variant)} ${className}`} />;
}
