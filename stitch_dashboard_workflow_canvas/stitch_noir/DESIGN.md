# Design System Strategy: The Kinetic Workspace

## 1. Overview & Creative North Star
The Creative North Star for this system is **"The Kinetic Workspace."** 

In an automation platform, complexity is the enemy. This design system rejects the cluttered, box-heavy "SaaS-standard" look in favor of a high-end editorial experience. We treat the canvas not as a grid of widgets, but as a sophisticated workbench. By utilizing deep charcoal foundations and high-contrast typography, we create a focus-driven environment where the user’s logic (the "nodes") feels like the only physical matter in the room.

We break the template feel through **intentional asymmetry** and **breathable negative space**. Instead of cramming controls into every corner, we use large-scale typography and expansive spacing to give the user’s mental model room to breathe.

## 2. Colors & Surface Philosophy
The palette is rooted in a spectrum of deep grays and monochromatic highlights, moving away from flat black to provide tonal depth.

### The "No-Line" Rule
**Borders are prohibited for structural sectioning.** We do not use 1px solid lines to separate a sidebar from a canvas or a header from a body. Boundaries are defined exclusively through:
- **Background Shifts:** Placing a `surface-container-low` panel against the `background` main stage.
- **Tonal Transitions:** Using the `surface-container-highest` to define active, interactive zones.

### Surface Hierarchy & Nesting
Think of the UI as a series of physical layers stacked on a dark stone floor.
*   **Level 0 (The Floor):** `surface` (#121318) - The base canvas.
*   **Level 1 (The Desk):** `surface-container` (#1E1F24) - Primary workspace panels.
*   **Level 2 (The Tool):** `surface-container-high` (#292A2F) - Modals and pop-overs.
*   **Level 3 (The Focus):** `surface-container-highest` (#34343A) - Hover states and active selections.

### The "Glass & Gradient" Rule
To add soul to the "High-End" aesthetic, floating elements (like node context menus) should use **Glassmorphism**. Apply `surface-variant` with a 70% opacity and a `20px` backdrop-blur. This allows the complex automation paths behind the UI to bleed through subtly, maintaining the user's spatial context.

## 3. Typography: Editorial Authority
We utilize a dual-font strategy to balance character with utility.

*   **Display & Headlines (Plus Jakarta Sans):** Used for high-level navigation and state changes. These should be set with tight letter-spacing (-0.02em) to feel authoritative and architectural.
*   **Body & Labels (Inter):** The "Workhorse." Inter provides maximum legibility for node configurations, JSON payloads, and variable names. 

**Hierarchy as Brand:** 
`display-lg` is reserved for empty states or major section headers to create a "poster-like" aesthetic. `label-sm` is used for technical metadata, rendered in `on-surface-variant` to keep the focus on the primary `body-lg` logic.

## 4. Elevation & Depth
Depth in this system is a result of **Tonal Layering**, not structural shadows.

*   **The Layering Principle:** Rather than adding a shadow to a card, place a `surface-container-lowest` card on top of a `surface-container` section. The subtle shift from `#0D0E13` to `#1E1F24` creates a natural "recessed" or "lifted" feel.
*   **Ambient Shadows:** If a node must float (e.g., during a drag-and-drop), use an extra-diffused shadow: `box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4)`. The shadow color must be a dark tint of the background, never pure black.
*   **The "Ghost Border" Fallback:** If accessibility requires a stroke (e.g., high-contrast mode), use `outline-variant` at 15% opacity. This provides a "suggestion" of a boundary without breaking the minimal aesthetic.

## 5. Components

### Buttons
*   **Primary:** `primary` (#FFFFFF) background with `on-primary` (#2F3131) text. **Corner Radius: md (1.5rem).** No border.
*   **Secondary:** `secondary-container` (#474747) with `on-secondary-container` (#B6B5B4) text.
*   **Tertiary:** Ghost style. No background, `primary` text. Use `surface-container-highest` on hover.

### The Automation Node (Custom Component)
Nodes should not have borders. Use `surface-container-low` for the node body. Use `headline-sm` for the node title. Instead of a "connector dot," use a high-contrast `primary` circle that glows subtly with a `primary-container` outer glow when active.

### Input Fields
*   **Style:** Minimalist underline or "ghost" box.
*   **Background:** `surface-container-lowest`. 
*   **Focus State:** Transition the background to `surface-container-highest` and change the text color to `primary`. Avoid blue focus rings; use a 1px `primary` bottom border only.

### Cards & Lists
*   **Forbid Dividers:** Do not use horizontal lines. Use `spacing-8` (2rem) of vertical white space to group content, or shift the background color of alternating items to `surface-container-low`.

### Chips & Tags
*   Use `rounded-full` (9999px). 
*   Background: `surface-variant`.
*   Typography: `label-md`.

## 6. Do's and Don'ts

### Do:
*   **DO** use `display-md` for empty states to make the product feel like a premium design tool rather than a spreadsheet.
*   **DO** use "Fluid Grids." Elements should feel like they are floating in an organized vacuum.
*   **DO** use subtle micro-interactions. A node should "scale-up" by 2% when hovered, using a `cubic-bezier(0.2, 0.8, 0.2, 1)` transition.

### Don't:
*   **DON'T** use 1px solid borders to define the layout. It creates "visual noise" that fatigues the user.
*   **DON'T** use pure black (#000000). Use the `surface` scale to maintain a sophisticated, non-crushed black look.
*   **DON'T** use standard "Drop Shadows." Stick to tonal layering and ambient, low-opacity blurs.
*   **DON'T** crowd the UI. If a feature isn't being used, it should fade to `on-surface-variant` or disappear entirely.