import { useRef } from "react";

export function Tabs<T extends string>({
  items,
  selected,
  onSelect,
  label,
  idPrefix,
  className = "dialog-tabs",
}: {
  items: ReadonlyArray<{ id: T; label: string }>;
  selected: T;
  onSelect: (value: T) => void;
  label: string;
  idPrefix: string;
  className?: string;
}) {
  const buttons = useRef(new Map<T, HTMLButtonElement>());
  return (
    <div role="tablist" aria-label={label} className={className}>
      {items.map((item, index) => (
        <button
          key={item.id}
          ref={(node) => {
            if (node) buttons.current.set(item.id, node);
            else buttons.current.delete(item.id);
          }}
          id={`${idPrefix}-${item.id}-tab`}
          type="button"
          role="tab"
          className="dialog-tab"
          aria-selected={selected === item.id}
          aria-controls={`${idPrefix}-${item.id}-panel`}
          tabIndex={selected === item.id ? 0 : -1}
          onClick={() => onSelect(item.id)}
          onKeyDown={(event) => {
            const delta =
              event.key === "ArrowRight"
                ? 1
                : event.key === "ArrowLeft"
                  ? -1
                  : 0;
            if (!delta && event.key !== "Home" && event.key !== "End") return;
            event.preventDefault();
            const next =
              items[
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? items.length - 1
                    : (index + delta + items.length) % items.length
              ].id;
            onSelect(next);
            buttons.current.get(next)?.focus();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
