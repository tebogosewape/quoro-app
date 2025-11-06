# Enterprise Theme Playbook

> Last updated: 2025-10-12

The Quora Financial web client now ships with a permanent, enterprise-grade visual theme. The theme emphasizes predictability, low-noise visuals, and the ability to tune brand tokens without touching feature code. This guide captures the intent, file structure, and customization workflows that keep the UI professional and consistent.

## Principles

- **Enterprise-first**: Treat every surface as a business tool. Favor clarity over novelty and keep interaction costs low.
- **KISS + SOLID aligned**:
    - KISS: prefer obvious gradients, limited motion, and reusable primitives instead of bespoke component styling per page.
    - SOLID: theme tokens act as a single source of truth, and feature styles depend on abstractions (`var(--token)`) rather than hard-coded values.
- **Token-driven**: All brand colors, radii, elevations, and interaction states are defined once in CSS custom properties.
- **Opt-in customization**: Altering the palette or spacing happens via token overrides, not scattered CSS rewrites.

## File & Folder Structure

```
apps/web/src/styles/
├── theme/
│   ├── index.css          # Entry point, imports tokens + component overrides
│   ├── tokens.css         # Core design tokens (colors, spacing, motion, feedback)
│   └── components.css     # Bootstrap-friendly component overrides using tokens
├── base/
│   └── variables.css      # Backwards-compatible import of theme/tokens.css
├── global.css             # Application-wide defaults (layout, glass effects)
├── surface-dark.css       # Optional dark-surface helpers
├── login.css              # Auth flow implementation that consumes tokens
└── ...                    # Other page-specific styles
```

### Import order

```tsx
// apps/web/src/main.tsx
import '@/styles/theme/index.css';
import '@/styles/global.css';
import '@/styles/surface-dark.css';
```

> `base/variables.css` now simply re-exports `theme/tokens.css` to preserve existing imports.

## Core Tokens

All tokens live in `apps/web/src/styles/theme/tokens.css`. Update values here to adjust the theme globally.

| Token                      | Purpose                              | Example Default                     |
| -------------------------- | ------------------------------------ | ----------------------------------- |
| `--color-brand-navy`       | Primary brand color for CTAs/headers | `#0c4068`                           |
| `--color-brand-aqua`       | Accent and focus color               | `#08b494`                           |
| `--surface-card`           | Default card background              | `#ffffff`                           |
| `--surface-card-border`    | Neutral card border                  | `rgba(12, 34, 48, 0.08)`            |
| `--surface-card-shadow`    | Soft elevation for cards             | `0 18px 36px rgba(12, 34, 48, 0.1)` |
| `--action-primary-start`   | CTA gradient start                   | matches `--color-brand-navy`        |
| `--action-primary-end`     | CTA gradient end                     | matches `--color-brand-teal`        |
| `--input-border-default`   | Base input group border              | `rgba(12, 34, 48, 0.16)`            |
| `--input-bg-subtle`        | Input background hover/focus tint    | `rgba(8, 180, 148, 0.08)`           |
| `--feedback-error-text`    | Inline error text color              | `#be3a33`                           |
| `--theme-font-family-sans` | Global sans-serif stack              | `'Inter', 'Segoe UI', ...`          |

Legacy names such as `--brand-teal`, `--legacy-navy`, `--radius`, and `--space-4` remain for compatibility. They delegate to the new tokens, so existing pages continue to work.

## Customization Workflow

1. **Adjust brand colors**: Edit the `--color-brand-*` tokens. Gradient, focus ring, and Bootstrap overrides automatically pick up the change.
2. **Tweak inputs or buttons**: Update interaction tokens (`--input-…`, `--action-primary-…`). Auth and future forms inherit the new feel without code changes.
3. **Change typography or spacing**: Modify `--theme-font-family-sans`, `--theme-font-scale-base`, or the `--space-*` scale.
4. **Extend tokens**: Add new custom properties to `tokens.css`, then consume them via `var(--my-token)` inside feature styles.
5. **Optional per-feature overrides**: Wrap pages in a `[data-theme='light']` attribute to opt into light tokens or define additional custom properties locally.

## Authoring Guidelines

- **Do not hardcode colors**. Reach for the closest `--color-*`, `--surface-*`, or `--action-*` token. If you can’t find one, create it in `tokens.css` before using it.
- **Favor composition over overrides**. Page styles (e.g. `login.css`) should only orchestrate tokens, layout, or minor variations.
- **Keep responsiveness predictable**. Use the provided spacing scale (`--space-*`) to retain consistent rhythm across breakpoints.
- **Document changes**. Any token edits should add a short note to `logs/vite.log` and, when non-trivial, an ADR or entry in `documentation/DEV_HISTORY.md`.

## Bootstrap Compatibility

`tokens.css` bridges to Bootstrap via CSS variables (`--bs-primary`, `--bs-body-font-family`, etc.). This means Bootstrap utilities respect the enterprise palette without extra overrides. The shared `.btn-primary` rule in `components.css` applies gradient, shadow, and focus treatments that match our CTA guidelines.

## Testing Checklist

After modifying tokens:

- Run `npm run lint` (caught in our CI) to ensure no accidental TS/JS regressions.
- Visually verify the login page plus a representative dashboard screen in both default and `[data-theme='light']` modes.
- If you changed focus or interaction tokens, tab through critical flows to confirm accessibility.

## Rollout Notes

- The auth experience is the reference implementation. All future surfaces should import the same theme entry-point and avoid bespoke gradients.
- To migrate older pages, gradually replace hardcoded colors with the new tokens and delete redundant CSS once aligned.

For deeper context, see `docs/DECISIONS.md` (theme entries) and keep this guide updated when tokens or structure evolve.
