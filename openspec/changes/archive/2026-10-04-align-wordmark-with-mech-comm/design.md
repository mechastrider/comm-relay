## Context

See proposal.md. The admin already uses a Consolas monospace stack. Mech-Comm's reference uses off-white #f0f3f4, orange #ff7627, weight 900, and 0.07em tracking.

## Goals / Non-Goals

Share a compact text wordmark across admin identity surfaces. Do not rename binaries or regenerate icons and promotional raster assets.

## Decisions

- Use a shared inline Wordmark component to keep the spelling and color split consistent, rather than repeating markup.
- Add dedicated brand color tokens instead of changing the global amber action palette.
- Keep existing heading sizes and the local monospace font stack to preserve layout; match the reference's weight, tracking, uppercase, and absence of glow.

## Risks / Trade-offs

The hyphen adds width; check existing desktop and narrow workspace geometry regressions.
