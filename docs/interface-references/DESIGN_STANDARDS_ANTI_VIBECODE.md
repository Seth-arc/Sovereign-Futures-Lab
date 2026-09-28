# Anti-Vibecode Styling Standard

## Design standards for AI-assisted / vibecoded web projects

The goal is not to ban specific techniques. It is to prevent the recognizable **AI-generated SaaS template aesthetic** that emerges when defaults are used without a coherent visual or product rationale.

Use **MUST / SHOULD / MAY** as implementation language.

---

## 1. Core Design Principle

Every visual decision **MUST be intentional and product-specific**.

A project should not look as though its visual language was assembled from the most statistically common patterns in contemporary SaaS landing pages.

Before adding a visual treatment, ask:

> Does this communicate hierarchy, interaction, state, brand, or product meaning?

If the answer is no, remove it.

---

# A. Color & Surface Standards

## ST-01 — Avoid harsh gradients

Do not default to:

- blue → purple
- purple → pink
- cyan → violet
- large multi-stop gradients
- gradient text everywhere

Gradients **MAY** be used when they belong to the visual identity or communicate something meaningful.

Prefer flat surfaces, tonal variation, restrained gradients, texture, opacity, and material differentiation.

## ST-02 — Never default to pure white

Avoid making the entire product:

```css
background: #ffffff;
```

Pure white **MAY** be used locally.

Primary surfaces SHOULD use intentionally selected off-whites, warm whites, cool whites, paper tones, or other contextually appropriate values.

Example:

```css
--surface-base: #f7f7f5;
--surface-raised: #fcfcfa;
--surface-muted: #efefec;
```

## ST-03 — No rainbow interface coloring

Color MUST have semantic responsibility.

Define categories such as:

```text
Primary action
Secondary action
Information
Success
Warning
Critical
Neutral
Selected
Disabled
```

Do not assign arbitrary colors merely to make cards visually distinct.

## ST-04 — Avoid the purple + black AI aesthetic

Do not automatically use black backgrounds with violet accents, electric blue, and glowing gradients.

Choose a palette derived from:

- product context
- institutional identity
- audience
- environment
- content
- domain

## ST-05 — Avoid neon colors without justification

Neon SHOULD be reserved for products where luminosity has a real visual role, such as games, music interfaces, cyber/security visualization, or creative tools.

Do not default to neon for dashboards, consulting sites, LMSs, enterprise software, or portfolios.

## ST-06 — Avoid generic pastel palettes

Do not automatically produce combinations of mint, lavender, peach, baby blue, and pale yellow.

Color relationships SHOULD come from a designed system rather than generic pleasantness.

---

# B. Typography Standards

## ST-07 — Do not default to Inter, Geist, or Space Grotesk

These fonts are legitimate, but their automatic use strongly contributes to sameness.

Typography SHOULD be selected according to the product's personality.

Define:

```text
Display type
Interface type
Reading type
Data / monospace type
```

Use one family when appropriate rather than forcing multiple typefaces.

## ST-08 — Establish an explicit type scale

Avoid arbitrary font sizes without hierarchy.

Define semantic tokens such as:

```css
--text-caption
--text-body-sm
--text-body
--text-body-lg
--text-heading-sm
--text-heading
--text-display
```

Typography MUST communicate structure before decoration does.

## ST-09 — Stop using em dashes as AI prose decoration

UI copy SHOULD be concise and syntactically natural.

Avoid:

> Powerful analytics — without the complexity.

when:

> Powerful analytics without the complexity.

works equally well.

This is a copywriting standard, not a prohibition on the punctuation mark.

---

# C. Iconography Standards

## ST-10 — Do not automatically use Lucide icons

Lucide is excellent infrastructure, but using the same library everywhere makes interfaces visually interchangeable.

Iconography SHOULD have a deliberate strategy:

1. custom symbols where identity matters;
2. product-specific icons where function requires them;
3. a consistent library for utility actions;
4. text labels where an icon adds nothing.

## ST-11 — No decorative sparkle icons

Avoid automatic use of sparkles, magic wands, stars, or similar symbols to represent:

- AI
- automation
- intelligence
- recommendations

Create product-specific metaphors instead.

## ST-12 — Avoid emojis as interface decoration

Emojis SHOULD NOT substitute for icons, information architecture, visual identity, or status systems.

They MAY be appropriate in conversational or intentionally informal products.

---

# D. Layout Standards

## ST-13 — Do not default to three feature cards

The classic:

```text
[Feature] [Feature] [Feature]
```

is not a design system.

Feature presentation SHOULD follow the information itself.

Consider:

- narrative sequence
- annotated product screenshots
- workflows
- diagrams
- comparison views
- interactive demonstrations
- alternating editorial layouts

## ST-14 — Avoid gratuitous bento grids

Bento layouts SHOULD only exist when modules are genuinely independent and heterogeneous.

Do not turn every section into a bento composition merely because it looks modern.

## ST-15 — Avoid the colored-left-stripe card pattern

Do not create visual hierarchy by repeatedly adding:

```css
border-left: 4px solid var(--accent);
```

Cards SHOULD differentiate themselves through hierarchy, density, typography, grouping, state, and content.

## ST-16 — Corner radius must belong to a system

Do not apply `12px`, `16px`, or `24px` rounded corners indiscriminately.

Define a radius scale:

```css
--radius-control: 4px;
--radius-panel: 8px;
--radius-dialog: 10px;
```

Some products SHOULD use sharp corners. Others SHOULD use subtle rounding. Highly rounded forms MAY be appropriate when deliberate.

---

# E. Depth & Material Standards

## ST-17 — Do not use generic drop shadows

Avoid:

```css
box-shadow: 0 10px 30px rgba(...);
```

on every container.

Create an elevation system only when elevation is meaningful.

Prefer borders, tonal separation, spacing, contrast, and layering before shadows.

## ST-18 — Avoid gratuitous liquid glass

Glassmorphism SHOULD NOT be the default visual treatment for nav bars, cards, dialogs, or floating panels.

Blur and translucency MAY be used where the interface genuinely represents layered spatial depth.

## ST-19 — No decorative radial orbs

Do not place blurred glowing circles behind hero copy merely because the page feels empty.

Background decoration SHOULD have a relationship to brand, content, product state, domain, or narrative.

## ST-20 — Avoid generic dot-grid backgrounds

Dot grids MAY be appropriate for spatial editors, diagram tools, CAD environments, or node interfaces.

They SHOULD NOT automatically appear behind landing-page hero sections.

---

# F. Product Presentation Standards

## ST-21 — Show the actual product

Marketing pages SHOULD prioritize:

1. real interface screenshots;
2. interactive product demonstrations;
3. recorded workflows;
4. realistic prototype states;
5. concrete outputs.

Avoid abstract promises replacing the actual experience.

## ST-22 — Do not use fake terminal windows

Do not create fake shell output unless the terminal is part of the product.

Technical credibility must come from the product, not terminal cosplay.

## ST-23 — Avoid fake testimonials

Never fabricate customer quotes or identities.

If genuine social proof is unavailable, show:

- design partners
- usage data
- pilot results
- case studies
- product capabilities
- nothing

No social proof is better than fictional social proof.

---

# G. Copy Standards

## ST-24 — Ban the “It’s not X, it’s Y” cliché by default

Avoid constructions such as:

> It's not a dashboard. It's your command center.

> It's not software. It's a second brain.

Use explicit language instead.

Example:

> A workspace for coordinating simulation design, facilitation, and analysis.

## ST-25 — Avoid checkmark bullet spam

Do not automatically write:

```text
✓ Fast
✓ Secure
✓ Scalable
✓ Easy
```

Use normal lists, structured comparisons, tables, or prose.

Checkmarks SHOULD communicate an actual state such as completed, included, verified, or passed.

## ST-26 — Eliminate generic AI marketing language

Avoid unsupported terms such as:

```text
Revolutionary
Seamless
Powerful
Next-generation
Game-changing
Intelligent
Effortless
Supercharge
Unlock
Transform
```

Prefer observable capability.

Instead of:

> Seamlessly transform your workflow.

Write:

> Import a CSV, map its fields, validate the records, and publish the dataset.

---

# H. Motion Standards

## ST-27 — Hover effects require interaction meaning

Do not make every element rise, glow, scale, rotate, or change gradient on hover.

Hover MUST communicate something useful:

```text
Clickable
Selected
Previewable
Draggable
Expandable
Focusable
```

## ST-28 — Avoid animated arrows

Do not add bouncing arrows simply to say “scroll down.”

Motion SHOULD direct attention only when attention needs directing.

## ST-29 — Motion needs a system

Define motion tokens such as:

```css
--motion-fast: 120ms;
--motion-standard: 180ms;
--motion-deliberate: 280ms;

--ease-standard: cubic-bezier(...);
--ease-enter: cubic-bezier(...);
--ease-exit: cubic-bezier(...);
```

Animations SHOULD explain causality, hierarchy, navigation, or state transitions rather than decorate inactivity.

---

# I. Loading & State Standards

## ST-30 — Every application needs designed loading states

Do not ignore:

- loading
- empty
- error
- offline
- unauthorized
- partial
- disabled
- saving
- success states

Use the loading representation appropriate to the content.

Skeletons are appropriate for predictable layouts.

Use skeleton states, progressive rendering, spinners, status text, and optimistic updates according to context.

A production interface cannot consist only of its ideal state.

---

# J. Pricing Standards

## ST-31 — Do not manufacture three pricing tiers

Do not automatically create:

```text
Starter | Pro | Enterprise
```

because SaaS websites commonly do.

Pricing architecture SHOULD follow actual:

- segmentation
- entitlement structure
- marginal costs
- buyer behavior
- procurement mechanisms

One plan may be correct. Five plans may be correct. Usage pricing may be correct. No public pricing may be correct.

---

# K. Legal & Trust Standards

## ST-32 — Production products require Terms of Service

A production product SHOULD expose appropriate:

- Terms
- acceptable-use rules
- licensing terms
- service conditions

where applicable.

Do not ship placeholder links.

## ST-33 — Production products require privacy documentation

If user information is collected, clearly communicate:

- what is collected
- why
- how it is processed
- retention
- sharing
- deletion
- user rights

Privacy is part of product design, not footer decoration.

---

# Higher-Level Rules

## 1. No defaults without justification

Framework defaults are implementation conveniences, not design decisions.

## 2. Design from the product outward

The interface should emerge from workflows, users, information, and domain, not from landing-page conventions.

## 3. Use visual elements semantically

Color, motion, icons, elevation, typography, and geometry should communicate something.

## 4. Show evidence rather than decoration

Real product > mock terminal.  
Real workflow > feature cards.  
Real customer evidence > fake testimonial.  
Real capability > marketing adjectives.

## 5. Design the entire system

A credible product includes:

```text
Loading
Empty
Error
Success
Permissions
Responsive behavior
Keyboard behavior
Accessibility
Legal surfaces
Product states
Real data
Edge cases
```

not merely the screenshot-ready happy path.

---

# Copy-Paste Standard for Coding Agents

Use the following in `AGENTS.md`, `CLAUDE.md`, a design prompt, or a project constitution:

```md
## UI DESIGN STANDARD — ANTI-GENERIC / ANTI-VIBECODE

Do not produce generic AI-generated SaaS aesthetics.

Every visual decision must be intentional, product-specific, and traceable
to hierarchy, usability, interaction, state, or brand.

### Do not default to:
- harsh or multi-color gradients
- Inter, Geist, or Space Grotesk
- Lucide icons for every interface element
- pure white page backgrounds
- rainbow feature coloring
- generic purple/black palettes
- neon accents
- generic pastel palettes
- ubiquitous drop shadows
- excessive rounded cards
- glassmorphism/liquid-glass surfaces
- decorative radial gradient orbs
- dot-grid hero backgrounds
- sparkle icons for AI features
- emojis as interface decoration
- three-card feature sections
- bento grids
- colored-left-border cards
- fake terminal windows
- fake testimonials
- arbitrary three-tier pricing
- checkmarks as generic bullets
- bouncing/animated arrows
- gratuitous hover animations
- decorative motion
- “It’s not X, it’s Y” copywriting
- excessive em-dash marketing copy

### Instead:
- derive the visual language from the product's domain and audience;
- establish explicit typography, spacing, radius, color, and motion systems;
- use restrained semantic color;
- prioritize information hierarchy over decoration;
- show real product interfaces and workflows;
- use icons only where they improve recognition;
- make motion explain interaction or state;
- design loading, empty, error, disabled, permission, and success states;
- use authentic product evidence rather than invented social proof;
- make responsive and accessibility behavior part of the design;
- include appropriate privacy and legal surfaces for production products.

Do not solve an empty composition by adding decoration.
Do not solve weak hierarchy by adding containers.
Do not solve weak product definition by adding marketing copy.

When something can be simpler, make it simpler.
When something can be demonstrated, demonstrate it instead of describing it.
The finished interface should look designed for this specific product,
not generated from a reusable SaaS template.
```

---

# Recommended Repository Usage

Store this file as:

```text
DESIGN_STANDARDS.md
```

Reference it from project-level agent instructions such as:

```text
AGENTS.md
CLAUDE.md
README.md
```

Product-specific visual doctrine should extend this standard rather than replace it.
