// Operator surfaces fetch the exact review revision separately from public status frames.
export function createAIReview(platform, messageID, t) {
  const panel = document.createElement("div");
  panel.className = "ai-inline-review";
  const feedback = document.createElement("p");
  feedback.setAttribute("role", "status");

  function button(label, action) {
    const node = document.createElement("button");
    node.type = "button";
    node.className = "btn-physical btn-small";
    node.textContent = t(label);
    node.addEventListener("click", action);
    return node;
  }

  async function load(errorKey = "") {
    panel.replaceChildren(feedback);
    feedback.textContent = t("state.loading");
    try {
      const response = await fetch("/api/ai-messages?state=review_pending&limit=100", { cache: "no-store" });
      if (!response.ok) throw new Error("review list unavailable");
      const page = await response.json();
      const job = page.items.find(item => item.platform === platform && item.message_id === messageID);
      if (!job?.prepared) {
        feedback.textContent = t("ai.reviewClosed");
        return;
      }
      const spoken = document.createElement("p");
      spoken.textContent = t("ai.spoken") + ": " + job.prepared.segments.map(segment => segment.text).join(" ");
      const reason = document.createElement("p");
      reason.textContent = job.reason || "";
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = t("ai.display");
      const display = document.createElement("p");
      display.textContent = job.prepared.display_text;
      const character = document.createElement("p");
      character.textContent = [job.prepared.character_id, job.prepared.image_id].join(" / ");
      details.append(summary, display, character);
      if (job.presentation?.image_asset) {
        const image = document.createElement("img");
        image.src = "/overlay/assets/" + encodeURIComponent(job.presentation.image_asset);
        image.alt = job.prepared.image_id;
        details.append(image);
      }
      const actions = document.createElement("div");
      actions.className = "ai-inline-review__actions";
      for (const action of ["approve", "reject"]) {
        actions.append(button("ai." + action, async () => {
          for (const control of actions.children) control.disabled = true;
          try {
            const response = await fetch("/api/ai-messages/" + action, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ job_id: job.id, expected_revision: job.revision }),
            });
            if (!response.ok) {
              await load(response.status === 409 ? "ai.error.conflict" : "ai.error.operation");
              return;
            }
            const updated = await response.json();
            feedback.textContent = t("ai.state." + updated.state);
            panel.replaceChildren(feedback);
          } catch {
            await load("ai.error.network");
          }
        }));
      }
      feedback.textContent = errorKey ? t(errorKey) : "";
      panel.replaceChildren(spoken, reason, details, actions, feedback);
    } catch {
      feedback.textContent = t("ai.error.network");
      panel.replaceChildren(feedback, button("state.retry", () => load()));
    }
  }

  void load();
  return panel;
}
