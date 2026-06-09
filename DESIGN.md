---
name: Lumina Connectivity System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3d494c'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6d797d'
  outline-variant: '#bcc9cd'
  surface-tint: '#00687a'
  primary: '#00687a'
  on-primary: '#ffffff'
  primary-container: '#2faec9'
  on-primary-container: '#003d48'
  inverse-primary: '#62d5f1'
  secondary: '#616200'
  on-secondary: '#ffffff'
  secondary-container: '#e6e748'
  on-secondary-container: '#666600'
  tertiary: '#565e74'
  on-tertiary: '#ffffff'
  tertiary-container: '#989fb8'
  on-tertiary-container: '#2f364b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#acedff'
  primary-fixed-dim: '#62d5f1'
  on-primary-fixed: '#001f26'
  on-primary-fixed-variant: '#004e5c'
  secondary-fixed: '#e8e94b'
  secondary-fixed-dim: '#cccd2f'
  on-secondary-fixed: '#1d1d00'
  on-secondary-fixed-variant: '#494900'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  code-technical:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-max-width: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system is engineered for a leading Chilean ISP, prioritizing clarity, technological reliability, and approachable service. The brand personality is "The Transparent Expert"—authoritative in its infrastructure but exceptionally simple in its delivery. 

The aesthetic follows a **Modern Corporate** direction with subtle **Glassmorphic** accents to signify the speed and "light" of fiber optics. The interface utilizes generous whitespace and a systematic hierarchy to ensure that complex data, such as coverage maps and billing cycles, remains accessible to a broad demographic. The visual tone is optimistic and precise, evoking the feeling of a seamless, uninterrupted connection.

## Colors

The palette is anchored by **Finet Cyan (#2FAEC9)**, representing innovation and the flow of data. **Finet Lime (#E3E446)** serves as a high-visibility accent for growth, energy, and primary calls-to-action (CTAs). 

- **Primary:** Used for brand presence, active states, and navigation headers.
- **Secondary:** Reserved for critical "Sign Up" or "Upgrade" buttons to ensure high conversion and visibility against the primary cyan.
- **Tertiary (Deep Slate):** Used for primary text and heavy structural elements to provide grounding and high contrast.
- **Surface Colors:** Use ultra-light tints of Cyan (e.g., #F0F9FB) for section backgrounds to maintain a fresh, airy feel.

## Typography

The typography system utilizes **Hanken Grotesk** for its exceptional legibility and contemporary "tech-utility" feel. It strikes a balance between professional geometry and humanist warmth. 

For technical data—such as IP addresses, modem settings, or bandwidth metrics—**Geist** is used to provide a precise, developer-friendly aesthetic that reinforces the ISP's technological backbone. 

**Hierarchy Rules:**
- Use **Display-LG** for hero section value propositions.
- **Label-SM** (Geist) should be used for small metadata, such as "Plan Details" or "Connection Status" tags.
- Ensure all body text maintains a minimum contrast ratio of 4.5:1 against backgrounds.

## Layout & Spacing

This design system employs a **12-column fluid grid** for desktop and a **4-column grid** for mobile. The spacing rhythm is based on a **4px baseline grid** to ensure mathematical harmony between components.

- **Desktop Layout:** Content is centered with a max-width of 1280px. Large margins (48px) prevent the UI from feeling cramped.
- **Information Density:** Use `stack-lg` (32px) to separate different service plans to allow each offering "room to breathe." Use `stack-sm` (8px) for internal card content (e.g., icon to headline).
- **Service Maps:** Coverage maps should span the full width of the viewport on mobile, but remain contained within the grid on desktop with a minimum height of 500px.

## Elevation & Depth

To communicate "Fiber-optic speed," depth is handled through **Tonal Layering** and **Soft Ambient Shadows**.

- **Level 0 (Base):** Pure white (#FFFFFF) or very light cool-grey (#F8FAFC).
- **Level 1 (Cards):** White surface with a 1px border in #E2E8F0. This is the primary container for service plans.
- **Level 2 (Hover/Active):** A soft, diffused shadow (0px 12px 24px rgba(47, 174, 201, 0.08)) is applied when a user interacts with a plan card, creating a subtle lift.
- **Overlays:** Use a 60% blur (12px) on backdrop layers for modals and navigation menus to create a sophisticated, tech-forward glass effect without sacrificing legibility.

## Shapes

The shape language is **Rounded (0.5rem / 8px)**. This radius is applied to buttons, input fields, and small cards. Larger containers (like the primary "Plan Comparison" cards) should use `rounded-xl` (1.5rem / 24px) to feel more substantial and friendly.

Avoid sharp corners to maintain the brand's approachable and modern personality. Icons should follow a similar language, featuring rounded caps and corners with a 2px stroke weight.

## Components

### Buttons
- **Primary:** Finet Cyan background with white text. High-gloss finish optional for hover.
- **Secondary (Conversion):** Finet Lime background with Deep Slate (#0F172A) text. This is used exclusively for "Hire Now" or "Checkout."
- **Ghost:** Transparent background with Cyan border. Used for secondary actions like "View Specifications."

### Service Cards
- Cards must have a clear "Speed" indicator in the top-left (e.g., 500 Mbps) using **Hanken Grotesk Bold**.
- Features within the card should be presented as a bulleted list with Finet Cyan checkmarks.

### Input Fields
- Use a 1px #CBD5E1 border that transitions to Finet Cyan on focus. 
- Error states must use a clear "Warning Red" (#EF4444) with a small Geist-font error message below the field.

### Status Indicators (Coverage/Support)
- Use "Pulse" animations for active support chats.
- Coverage maps should use a semi-transparent Finet Cyan overlay for "Available Areas" and a light grey for "Coming Soon."

### Support & Chat
- The persistent support trigger should be a floating action button in the bottom right, using the primary Cyan and a simple speech-bubble icon.