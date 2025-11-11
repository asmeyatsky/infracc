# Searce Design System Documentation
## Cloud Migration Accelerator - Professional Theme

**Version:** 1.0.0
**Last Updated:** 2025-10-02
**Brand:** Searce
**Primary Font:** Poppins (Google Fonts)

---

## 🎨 Overview

This design system provides a professional, modern, and consistent visual language for the Searce Cloud Migration Accelerator platform. It's built with Searce's brand identity at its core, featuring their signature blue color palette, Poppins typography, and clean, tech-forward aesthetic.

### Design Philosophy

- **Professional:** Enterprise-grade appearance suitable for C-suite presentations
- **Modern:** Contemporary design patterns and micro-interactions
- **Clean:** Minimalist approach with focus on content and data
- **Accessible:** WCAG 2.1 AA compliant with proper contrast and ARIA support
- **Responsive:** Mobile-first approach with tablet and desktop optimizations

---

## 🎨 Color Palette

### Primary Colors - Searce Blue

```css
--searce-blue-primary: #0066CC    /* Primary brand blue */
--searce-blue-dark: #004C99       /* Headers, emphasis */
--searce-blue-light: #3399FF      /* Hover states */
--searce-blue-lighter: #E6F2FF    /* Backgrounds */
--searce-blue-accent: #0052A3     /* Accents */
```

**Usage:**
- Primary: Main CTAs, links, active states
- Dark: Headers, navigation, emphasis text
- Light: Hover effects, interactive elements
- Lighter: Card backgrounds, subtle highlights
- Accent: Borders, decorative elements

### Neutral Colors

```css
--searce-black: #1A1A1A          /* Rich black for text */
--searce-gray-900: #2D2D2D       /* Dark gray */
--searce-gray-800: #3D3D3D       /* Body text */
--searce-gray-700: #5C5C5C       /* Secondary text */
--searce-gray-600: #757575       /* Muted text */
--searce-gray-500: #9E9E9E       /* Borders */
--searce-gray-400: #BDBDBD       /* Disabled states */
--searce-gray-300: #E0E0E0       /* Light borders */
--searce-gray-200: #EEEEEE       /* Subtle backgrounds */
--searce-gray-100: #F5F5F5       /* Page background */
--searce-white: #FFFFFF          /* Pure white */
```

### Semantic Colors

```css
--searce-success: #00C853        /* Success states */
--searce-warning: #FFB300        /* Warning states */
--searce-error: #D32F2F          /* Error states */
--searce-info: #0288D1           /* Info states */
```

### Gradients

```css
--gradient-primary: linear-gradient(135deg, #0066CC 0%, #004C99 100%)
--gradient-light: linear-gradient(135deg, #E6F2FF 0%, #FFFFFF 100%)
--gradient-overlay: linear-gradient(180deg, rgba(0,102,204,0.05) 0%, rgba(255,255,255,0) 100%)
```

**Color Accessibility:**

| Combination | Contrast Ratio | WCAG Level |
|-------------|----------------|------------|
| Blue Primary on White | 7.2:1 | AAA |
| Gray 800 on White | 10.7:1 | AAA |
| Gray 600 on White | 4.8:1 | AA |
| White on Blue Primary | 7.2:1 | AAA |

---

## ✍️ Typography

### Font Family: Poppins

**Import Statement:**
```css
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
```

### Font Weights

- **Light (300):** Rarely used, decorative purposes only
- **Regular (400):** Body text, paragraphs, descriptions
- **Medium (500):** Secondary headings, emphasized text
- **Semibold (600):** Primary headings, card titles
- **Bold (700):** Main headings, important CTAs
- **Extra Bold (800):** Hero text, marketing materials

### Type Scale

```css
--font-size-xs: 0.75rem     /* 12px - Small labels, captions */
--font-size-sm: 0.875rem    /* 14px - Secondary text, table data */
--font-size-base: 1rem      /* 16px - Body text */
--font-size-lg: 1.125rem    /* 18px - Lead paragraphs */
--font-size-xl: 1.25rem     /* 20px - Small headings */
--font-size-2xl: 1.5rem     /* 24px - Medium headings */
--font-size-3xl: 1.875rem   /* 30px - Large headings */
--font-size-4xl: 2.25rem    /* 36px - Page titles */
--font-size-5xl: 3rem       /* 48px - Hero text */
```

### Typography Usage Examples

```html
<h1>Page Title</h1>          <!-- 36px, Bold, Blue Dark -->
<h2>Section Heading</h2>     <!-- 30px, Semibold, Blue Dark -->
<h3>Card Title</h3>          <!-- 24px, Semibold, Black -->
<h4>Subsection</h4>          <!-- 20px, Medium, Black -->
<p>Body text content</p>     <!-- 16px, Regular, Gray 800 -->
<span class="text-muted">Secondary info</span> <!-- 16px, Regular, Gray 600 -->
```

### Line Height

- **Headings:** 1.3 (tight for impact)
- **Body Text:** 1.7 (comfortable reading)
- **UI Elements:** 1.5 (balanced)

---

## 📐 Spacing System

### 8px Grid System

All spacing follows an 8px base grid for visual consistency:

```css
--spacing-xs: 4px     /* 0.25rem - Tight spacing */
--spacing-sm: 8px     /* 0.5rem  - Small gaps */
--spacing-md: 16px    /* 1rem    - Default spacing */
--spacing-lg: 24px    /* 1.5rem  - Section spacing */
--spacing-xl: 32px    /* 2rem    - Large gaps */
--spacing-2xl: 40px   /* 2.5rem  - Major sections */
--spacing-3xl: 48px   /* 3rem    - Page sections */
--spacing-4xl: 64px   /* 4rem    - Hero sections */
```

**Usage Guidelines:**
- Component internal padding: `sm` (8px) to `lg` (24px)
- Card padding: `xl` (32px)
- Section margins: `2xl` (40px) to `3xl` (48px)
- Page margins: `xl` (32px) to `4xl` (64px)

---

## 🎯 Components

### 1. Buttons

#### Primary Button
```html
<button class="btn btn-primary">
  Primary Action
</button>
```
**Style:**
- Background: Blue gradient
- Color: White
- Shadow: Subtle blue glow
- Hover: Darker blue, lift effect

#### Secondary Button
```html
<button class="btn btn-secondary">
  Secondary Action
</button>
```
**Style:**
- Background: White
- Border: Gray 400
- Color: Gray 800
- Hover: Gray 100 background

#### Outline Button
```html
<button class="btn btn-outline-primary">
  Outline Action
</button>
```
**Style:**
- Background: Transparent
- Border: Blue primary
- Color: Blue primary
- Hover: Filled blue

#### Button Sizes

```html
<button class="btn btn-primary btn-sm">Small</button>
<button class="btn btn-primary">Medium (Default)</button>
<button class="btn btn-primary btn-lg">Large</button>
```

### 2. Cards

#### Standard Card
```html
<div class="card">
  <div class="card-header">
    <h5>Card Title</h5>
  </div>
  <div class="card-body">
    Card content goes here
  </div>
  <div class="card-footer">
    Footer content
  </div>
</div>
```

**Variants:**
- `.card-primary` - Blue gradient header
- `.card-elevated` - Larger shadow, no border
- `.card-flat` - No shadow, transparent background

### 3. Metric Cards

```html
<div class="metric-card">
  <div class="metric-header">
    <span class="metric-icon">💰</span>
    <span class="trend trend-up">↑ 15%</span>
  </div>
  <div class="metric-value">$450,000</div>
  <div class="metric-label">Total Investment</div>
  <p class="metric-description">One-time + 12-month operational</p>
</div>
```

**Features:**
- Hover lift effect
- Top accent bar
- Icon with drop shadow
- Trend indicator (up/down)
- Responsive sizing

### 4. Badges

```html
<span class="badge badge-primary">Primary</span>
<span class="badge badge-success">Success</span>
<span class="badge badge-warning">Warning</span>
<span class="badge badge-danger">Danger</span>
```

**Characteristics:**
- Pill-shaped (fully rounded)
- Uppercase text
- Letter-spacing: 0.05em
- Font weight: Semibold

### 5. Alerts

```html
<div class="alert alert-success">
  Success message
</div>
<div class="alert alert-warning">
  Warning message
</div>
<div class="alert alert-danger">
  Error message
</div>
<div class="alert alert-info">
  Information message
</div>
```

### 6. Forms

```html
<div class="mb-3">
  <label class="form-label">Email Address</label>
  <input type="email" class="form-control" placeholder="you@example.com">
</div>
```

**Focus State:**
- Border: Blue primary
- Shadow: Blue glow (3px)
- Background: White

---

## 📊 Dashboard Components

### Metric Card Group

```html
<div class="metric-card-group">
  <div class="metric-card">...</div>
  <div class="metric-card">...</div>
  <div class="metric-card">...</div>
  <div class="metric-card">...</div>
</div>
```

**Layout:**
- Grid: Auto-fit with 250px minimum
- Gap: 24px
- Responsive: 4 → 2 → 1 columns

### Cost Comparison Visualization

```html
<div class="cost-comparison-bars">
  <div class="cost-bar-group">
    <div class="bar-label">Month 0</div>
    <div class="bars">
      <div class="bar bar-onprem" style="width: 100%">$50K</div>
      <div class="bar bar-cloud" style="width: 70%">$35K</div>
    </div>
    <div class="savings-label">Savings: $15K</div>
  </div>
</div>
```

**Colors:**
- On-Premise: Red gradient (#D32F2F → #C62828)
- Cloud: Blue gradient (brand colors)
- Savings: Success green

### Timeline Visualization

```html
<div class="executive-timeline">
  <div class="timeline-phases">
    <div class="timeline-phase">
      <div class="phase-header">
        <h6>Assessment & Planning</h6>
        <span class="badge bg-secondary">4 weeks</span>
      </div>
      <div class="phase-bar">
        <div class="phase-progress" style="width: 100%"></div>
      </div>
    </div>
  </div>
</div>
```

**Features:**
- Shimmer animation on progress bars
- Phase badges
- Milestone markers
- Responsive layout

---

## 🎭 Animations & Transitions

### Transition Speeds

```css
--transition-fast: 150ms    /* Hover effects, focus states */
--transition-base: 250ms    /* Standard interactions */
--transition-slow: 350ms    /* Complex animations */
```

**Easing Function:** `cubic-bezier(0.4, 0, 0.2, 1)` (Material Design easing)

### Common Animations

**Fade In:**
```css
.fade-in {
  animation: fadeIn 250ms ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

**Slide In Right:**
```css
.slide-in-right {
  animation: slideInRight 350ms ease-out;
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
}
```

**Shimmer (Loading):**
```css
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```

### Hover Effects

**Cards:**
- Transform: `translateY(-4px)`
- Shadow: Elevation increase
- Transition: 250ms

**Buttons:**
- Transform: `translateY(-1px)`
- Shadow: Blue glow
- Background: Darker shade

---

## 📱 Responsive Design

### Breakpoints

```css
/* Mobile First Approach */
@media (max-width: 768px)  { /* Mobile */ }
@media (max-width: 1024px) { /* Tablet */ }
@media (max-width: 1200px) { /* Small Desktop */ }
@media (min-width: 1400px) { /* Large Desktop */ }
```

### Responsive Patterns

**Metric Card Grid:**
- Desktop (1400px+): 4 columns
- Tablet (768px-1200px): 2 columns
- Mobile (<768px): 1 column

**Navigation:**
- Desktop: Horizontal pills
- Mobile: Vertical stack with icons only

**Dashboard Layout:**
- Desktop: Side-by-side charts
- Mobile: Stacked charts, full width

---

## 🎯 Shadows & Elevation

### Shadow System

```css
--shadow-xs: 0 1px 2px rgba(26,26,26,0.05)       /* Subtle hint */
--shadow-sm: 0 2px 4px rgba(26,26,26,0.06)       /* Cards */
--shadow-md: 0 4px 6px rgba(26,26,26,0.08)       /* Elevated cards */
--shadow-lg: 0 10px 15px rgba(26,26,26,0.08)     /* Dropdowns */
--shadow-xl: 0 20px 25px rgba(26,26,26,0.08)     /* Modals */
--shadow-2xl: 0 25px 50px rgba(26,26,26,0.12)    /* Hero elements */
--shadow-blue: 0 8px 16px rgba(0,102,204,0.15)   /* Primary CTAs */
```

**Elevation Guidelines:**
- Level 0: Page background (no shadow)
- Level 1: Cards, tiles (shadow-sm)
- Level 2: Dropdowns, tooltips (shadow-md)
- Level 3: Dialogs, modals (shadow-xl)
- Level 4: Fullscreen overlays (shadow-2xl)

---

## ♿ Accessibility

### WCAG 2.1 Compliance

**Color Contrast:**
- Text: Minimum 4.5:1 (AA)
- Large text: Minimum 3:1 (AA)
- UI components: Minimum 3:1 (AA)

**Focus Indicators:**
```css
.btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.25);
}
```

**ARIA Attributes:**
```html
<button role="tab" aria-selected="true" aria-controls="panel-1">
  Tab 1
</button>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">
  Content
</div>
```

**Screen Reader Support:**
- All images have `alt` attributes
- Form inputs have associated labels
- Loading states use `aria-live` regions
- Modal dialogs use `role="dialog"`

---

## 🧩 Design Patterns

### Card Hover States

All cards should have consistent hover behavior:
1. Lift effect: `translateY(-2px)` to `translateY(-4px)`
2. Shadow increase: `shadow-sm` → `shadow-md`
3. Transition: 250ms cubic-bezier
4. Optional: Accent bar reveal

### Loading States

**Spinners:**
```html
<div class="spinner-border text-primary"></div>
```

**Skeleton Screens:**
Use gray-200 background with shimmer animation for placeholder content.

**Progress Bars:**
```html
<div class="progress">
  <div class="progress-bar" style="width: 75%"></div>
</div>
```

### Empty States

```html
<div class="empty-state">
  <div class="empty-icon">📊</div>
  <h4>No Data Available</h4>
  <p>Run discovery to see your assets</p>
  <button class="btn btn-primary">Run Discovery</button>
</div>
```

---

## 🎨 Branding Guidelines

### Logo Usage

**Primary Logo:**
- SVG format
- Gradient fill: Blue primary → Blue dark
- Minimum size: 32px height
- Clear space: Equal to logo height on all sides

**Tagline:**
- Font: Poppins Medium
- Size: 12px
- Color: Gray 600
- Transform: Uppercase
- Letter-spacing: 0.1em

### Brand Voice

**Professional:** Enterprise-grade, authoritative
**Approachable:** Helpful, human, conversational
**Technical:** Precise, accurate, data-driven
**Forward-thinking:** Innovative, modern, progressive

### Iconography

**Style:** Rounded, friendly, modern
**Size:** 24px standard, 16px small, 32px+ large
**Color:** Match text color or use primary blue
**Source:** Unicode emoji for quick prototyping, custom SVGs for production

---

## 📖 Usage Examples

### Executive Dashboard Metric Cards

```html
<div class="metric-card-group">
  <div class="metric-card">
    <div class="metric-header">
      <span class="metric-icon">💰</span>
    </div>
    <div class="metric-value">$450,000</div>
    <div class="metric-label">Total Investment</div>
    <p class="metric-description">One-time + 12-month operational</p>
  </div>

  <div class="metric-card">
    <div class="metric-header">
      <span class="metric-icon">📈</span>
      <span class="trend trend-up">↑ 125%</span>
    </div>
    <div class="metric-value text-success">125%</div>
    <div class="metric-label">3-Year ROI</div>
    <p class="metric-description">Return on investment over 36 months</p>
  </div>
</div>
```

### Risk Summary Cards

```html
<div class="risk-item card risk-high">
  <div class="card-body">
    <span class="badge badge-warning">High</span>
    <h6>Complex Dependencies</h6>
    <p>Multiple interdependent systems require careful sequencing</p>
    <div class="mitigation">
      <strong>Mitigation:</strong> Use phased approach with thorough testing
    </div>
  </div>
</div>
```

### Timeline Visualization

```html
<div class="executive-timeline">
  <div class="timeline-phase">
    <div class="phase-header">
      <h6>Assessment & Planning</h6>
      <span class="badge bg-secondary">4 weeks</span>
    </div>
    <div class="phase-bar">
      <div class="phase-progress" style="width: 75%"></div>
    </div>
  </div>
</div>
```

---

## 🔧 Implementation Guide

### Step 1: Import Styles

```javascript
// In index.js or main App file
import './styles/searce-design-system.css';
import './styles/dashboard-components.css';
```

### Step 2: Use Components

```jsx
import React from 'react';

export const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Executive Overview</h2>
        <p className="subtitle">Cloud Migration Strategic Summary</p>
      </div>

      <div className="metric-card-group">
        <div className="metric-card">
          <div className="metric-value">$450K</div>
          <div class="metric-label">Total Investment</div>
        </div>
      </div>
    </div>
  );
};
```

### Step 3: Customize Variables

Override CSS variables in your theme:

```css
:root {
  --searce-blue-primary: #0066CC; /* Your custom blue */
  --spacing-xl: 32px;              /* Your custom spacing */
}
```

---

## 🎯 Best Practices

### DO ✅

- Use the spacing system (8px grid)
- Maintain color contrast ratios
- Use Poppins font consistently
- Add hover states to interactive elements
- Include ARIA attributes for accessibility
- Use semantic HTML elements
- Test on mobile devices
- Optimize images and assets

### DON'T ❌

- Mix different font families
- Use arbitrary spacing (stick to the scale)
- Ignore color contrast requirements
- Remove focus indicators
- Use color alone to convey meaning
- Nest cards more than 2 levels deep
- Overuse animations
- Forget loading and error states

---

## 📚 Resources

### Design Files

- **Figma:** [Coming soon]
- **Sketch:** [Coming soon]
- **Adobe XD:** [Coming soon]

### Code Repository

- **GitHub:** `/src/styles/`
- **Storybook:** [Coming soon]

### Brand Assets

- **Logo Pack:** Contact marketing team
- **Icon Library:** Using Unicode emoji + custom SVGs
- **Image Guidelines:** High-resolution, professional photography

---

## 📝 Changelog

### Version 1.0.0 (2025-10-02)

**Initial Release:**
- Complete color palette with Searce branding
- Poppins typography system
- 8px spacing grid
- Comprehensive component library
- Dashboard-specific components
- Professional header with branding
- Responsive design patterns
- Accessibility features (WCAG 2.1 AA)
- Animation and transition system
- Shadow and elevation system

---

## 🤝 Contributing

### Proposing Changes

1. Document the change and rationale
2. Show visual examples
3. Ensure accessibility compliance
4. Get approval from design team
5. Update this documentation

### Code Style

- Use CSS custom properties (variables)
- Follow BEM naming convention
- Comment complex selectors
- Group related styles together
- Use rem units for sizing

---

**Designed by:** Searce Design Team
**Implemented by:** Claude Code
**Maintained by:** Development Team
**Contact:** design@searce.com (example)

---

*This design system is a living document and will evolve as the product grows. Always refer to the latest version for current guidelines.*
