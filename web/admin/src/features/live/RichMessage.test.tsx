import { render, fireEvent } from "@testing-library/react";
import { expect, it } from "vitest";
import { MessageContent } from "./RichMessage";
import type { ChatMessage } from "./message-model";
const message: ChatMessage = {
  id: "1",
  platform: "twitch",
  user_id: "1",
  username: "viewer",
  display_name: "Viewer",
  message: "test",
  timestamp: "2026-01-01T00:00:00Z",
  fragments: [
    { type: "emote", text: "Kappa", url: "https://example.com/emote.png" },
    {
      type: "image_link",
      text: "photo",
      url: "https://images.example.com/photo.png",
    },
    { type: "text", text: "<script>bad()</script>" },
  ],
};
const previews = { enabled: true, allowed_hosts: ["example.com"] };
it("preserves rich content DOM identity when command outcomes or rewards change", () => {
  const { container, rerender } = render(
    <MessageContent message={message} previews={previews} />,
  );
  const images = Array.from(container.querySelectorAll("img"));
  expect(images).toHaveLength(2);
  rerender(
    <MessageContent
      message={{
        ...message,
        granted_award_ids: ["like"],
        command_outcome: {
          trigger: "!test",
          status: "cooldown",
          cooldown_expires_at_ms: Date.now() + 3000,
        },
      }}
      previews={previews}
    />,
  );
  Array.from(container.querySelectorAll("img")).forEach((node, index) =>
    expect(node).toBe(images[index]),
  );
  expect(container.querySelector("script")).toBeNull();
  expect(container.textContent).toContain("<script>bad()</script>");
});
it("falls back to text for failed images and rejects untrusted previews", () => {
  const { container, rerender } = render(
    <MessageContent message={message} previews={previews} />,
  );
  fireEvent.error(container.querySelector("img")!);
  expect(container.textContent).toContain("Kappa");
  rerender(
    <MessageContent
      message={message}
      previews={{ enabled: true, allowed_hosts: ["other.example"] }}
    />,
  );
  expect(container.querySelector("img")).toBeNull();
  expect(container.textContent).toContain("photo");
});
