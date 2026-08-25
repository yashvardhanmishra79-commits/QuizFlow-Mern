---
name: QuizFlow Professional
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#434655'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#3e3fcc'
  on-tertiary: '#ffffff'
  tertiary-container: '#585be6'
  on-tertiary-container: '#f1eeff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  space-xs: 4px
  space-sm: 8px
  space-md: 16px
  space-lg: 24px
  space-xl: 40px
  space-2xl: 64px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style
The design system is rooted in **Modern Corporate** principles with a focus on high-utility and premium clarity. It targets educational administrators and coaching institutes, requiring a personality that is authoritative yet approachable. 

The aesthetic leverages **Minimalism** to reduce cognitive load during complex quiz management tasks. It utilizes a "Surface-on-Surface" approach to create hierarchy, emphasizing clean lines, generous white space, and a refined interface that suggests stability and professional-grade performance.

## Colors
This design system uses a primary "QuizFlow Blue" to signal action and intent. A secondary teal is reserved for "success" states or progress indicators, while soft indigo provides a tertiary accent for categorization.

- **Primary (#2563EB):** Use for main buttons, active states, and primary navigation links.
- **Secondary (#0D9488):** Use for completion metrics and positive feedback loops.
- **Neutral/Text (#1E293B):** Primary content color. For secondary text, use a 60% opacity of this hex.
- **Surfaces:** Use `#FFFFFF` for the base canvas. Use `#F9FAFB` for container backgrounds and sidebars to differentiate content zones.

## Typography
The system relies on **Inter** to provide a systematic, utilitarian feel that maintains high legibility across data-heavy tables and quiz editors. 

- **Hierarchy:** Use `headline-xl` sparingly for landing hero sections. `headline-md` is the standard for dashboard cards and section titles.
- **Readability:** Body text uses a generous 1.5x line height to ensure long-form questions and instructions are easy to digest.
- **Labels:** Use `label-md` for table headers and small metadata categories to create a distinct visual break from body content.

## Layout & Spacing
The layout follows a **Fluid Grid** system with a fixed maximum container width of 1280px for desktop to prevent line lengths from becoming unreadable.

- **Grid:** Use a 12-column grid for desktop with 24px gutters.
- **Rhythm:** All margins and paddings must be multiples of the 4px base unit. 
- **Desktop/Tablet:** Content should have 40px (space-xl) page margins.
- **Mobile:** Scale page margins down to 16px (space-md). Stack all multi-column layouts into a single column.

## Elevation & Depth
Depth is conveyed through **Tonal Layers** and **Ambient Shadows**. The design avoids heavy black shadows in favor of tinted, diffused elevations that feel integrated into the "QuizFlow Blue" environment.

- **Level 0 (Base):** `#FFFFFF` - The main background.
- **Level 1 (Cards):** `#FFFFFF` with a 1px border of `#E2E8F0` and a subtle shadow (0px 4px 6px -1px rgba(30, 41, 59, 0.05)).
- **Level 2 (Hover/Modals):** A more pronounced shadow (0px 10px 15px -3px rgba(30, 41, 59, 0.1)) to indicate interactivity or focus.
- **Interaction:** Buttons use a slight vertical lift on hover, achieved by increasing shadow spread and slightly lightening the background color.

## Shapes
The shape language is consistently **Rounded**, reflecting a modern and accessible software feel.

- **Standard Radius:** 8px (0.5rem) for buttons, input fields, and smaller UI components.
- **Large Radius:** 16px (1rem) for main dashboard cards and modals.
- **Pill Radius:** Used exclusively for status chips (e.g., "Active", "Draft") and tags to distinguish them from actionable buttons.

## Components

### Buttons
- **Primary:** Solid `#2563EB` background with white text. 8px corner radius.
- **Secondary:** Ghost style. 1px border of `#E2E8F0` with `#1E293B` text.
- **States:** Hover state for primary buttons should be a 10% darken of the hex.

### Cards
- White background, 16px radius, and Level 1 elevation. 
- Internal padding should be `space-lg` (24px) for a premium feel.

### Input Fields
- 8px radius with a 1px border of `#E2E8F0`. 
- Focus state: Border changes to `#2563EB` with a 2px outer glow of the same color at 10% opacity.

### Chips & Badges
- Used for quiz categories or status. 
- Use light background tints of the primary/secondary colors (10% opacity) with the full-saturation hex for the text.

### Lists & Tables
- Rows should have a minimum height of 56px.
- Use subtle horizontal dividers (`#E2E8F0`) only. Avoid vertical borders to keep the interface airy.

### Additional Components
- **Progress Steppers:** Use for multi-page quiz creation. Thick 4px lines with `#2563EB` for completed steps and `#E2E8F0` for upcoming steps.
- **Empty State Illustrations:** Use thin-line, two-tone blue and gray illustrations to guide users when no quizzes are present.