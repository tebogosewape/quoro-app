# QMAPI Enterprise Theme Playbook

> Last updated: 2026-11-15

QMAPI uses a compact, low-noise enterprise theme. The target is a practical business interface: restrained spacing, clear hierarchy, flat actions, accessible focus, and no decorative glow.

The migration authority and screen-by-screen acceptance gates are in `docs/THEME_MIGRATION_TODO.md`. `AGENTS.md` and `CLAUDE.md` require every contributor to follow that checklist.

## Non-negotiable rules

- Use the existing QMAPI behaviour as the functional authority. Reference projects may supply presentation only.
- Inputs, select boxes, and normal buttons use the compact `38px` control height. Small controls use `34px`; icon-only actions retain a `36px` usable target.
- Do not add glow components, luminous borders, decorative `text-shadow`, pulsing shadows, or coloured halo shadows.
- Use a solid `2px` focus outline. Removing glow must never remove keyboard focus visibility.
- Use subtle neutral shadows only when elevation communicates hierarchy.
- Do not start the next screen until the current screen has passed its responsive, UX, visual, functional, automated, and manual acceptance gates.
- Clear relevant legacy lint errors while migrating each screen. Do not hide errors by weakening lint rules.

## Theme files and import order

```text
apps/web/src/styles/
|-- theme/
|   |-- index.css
|   |-- tokens.css
|   `-- components.css
|-- base/variables.css
|-- global.css
|-- surface-dark.css
|-- admin-template.css
|-- authorized.css
|-- login.css
`-- onboarding.css
```

`apps/web/src/main.tsx` loads styles in this order:

1. Bootstrap and Font Awesome;
2. compatibility variables;
3. theme tokens and shared components;
4. global rules;
5. optional dark-surface compatibility;
6. the enterprise admin template.

Later files may refine layout but must not reintroduce oversized controls, glow, or inaccessible focus states.

## Core tokens

| Token | Purpose | Default |
| --- | --- | --- |
| `--color-brand-navy` | primary brand/navigation | `#0c4068` |
| `--color-brand-teal` | dark brand accent | `#01555a` |
| `--color-brand-aqua` | interactive accent/focus | `#08b494` |
| `--color-success` | success state | `#0b8f75` |
| `--color-warning` | warning state | `#c47b12` |
| `--color-danger` | destructive/error state | `#c44545` |
| `--color-finance` | financial values | `#a66b14` |
| `--color-review` | review state | `#7656a8` |
| `--color-processing` | processing state | `#247b9b` |
| `--control-height-sm` | compact small control | `34px` |
| `--control-height-md` | standard form/action control | `38px` |
| `--control-height-icon` | icon-only target | `36px` |
| `--focus-outline` | keyboard focus indicator | `2px solid #08b494` |
| `--surface-card-shadow` | restrained neutral elevation | `0 4px 14px rgba(12, 34, 48, 0.08)` |

Legacy aliases remain temporarily for compatibility. New work must consume the semantic tokens directly.

## Component guidance

- Buttons use flat navy or teal surfaces, compact padding, and calm colour changes on hover. Do not translate, bounce, shine, or glow.
- Inputs and selects share the same height, border, radius, padding, and focus outline.
- Textareas may be taller because their content requires it; they still use the compact field styling.
- Cards use a white surface, a neutral border, and restrained elevation.
- Selected states use border, fill, icon, or text weight—not a halo.
- Status badges use the semantic palette and must remain legible without relying on colour alone where meaning is critical.
- Responsive tables need an intentional mobile treatment; shrinking a desktop table until it becomes unusable is not acceptable.

## Validation workflow

For each screen:

1. implement only the mapped screen and its required shared components;
2. check 320px, 375px, 768px, 1024px, and 1440px widths;
3. verify no horizontal overflow, clipping, overlap, or oversized controls;
4. test keyboard navigation, focus visibility, validation, loading, empty, and error states;
5. regression-test permissions and business behaviour;
6. run relevant lint, type-check, tests, and the production build;
7. record the result and obtain manual acceptance before moving on.

The repository-wide lint baseline currently contains legacy failures. This is tracked in the 2026-11-15 implementation log; relevant failures must be removed as each screen is migrated.
