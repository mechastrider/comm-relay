import { createElement, type CSSProperties } from "react";
import {
  alertEmblemModel,
  alertEmblemShapes,
} from "../../../shared/alert-emblem";
export function AlertEmblem({
  kind,
  identifier,
  label,
  style,
}: {
  kind: "command" | "award" | "greeting";
  identifier: string;
  label: string;
  style?: CSSProperties;
}) {
  const model = alertEmblemModel(kind, identifier, label);
  return (
    <div
      className={`alert-emblem alert-emblem--${model.kind} alert-emblem--symbol-${model.symbol} alert-emblem--variant-${model.variant}`}
      aria-hidden="true"
      data-emblem-symbol={model.symbol}
      style={style}
    >
      <svg
        className="alert-emblem__svg"
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {alertEmblemShapes(model.symbol).map(
          (
            [tag, attributes]: [string, Record<string, string>],
            index: number,
          ) => createElement(tag, { ...attributes, key: index }),
        )}
      </svg>
      <span className="alert-emblem__orbit" />
    </div>
  );
}
