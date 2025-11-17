# Visual Design System

This document describes the complete visual design system for credential.studio, including color palettes, typography, spacing, components, and design patterns.

## Design Philosophy

credential.studio uses a modern, professional design system built on:
- **shadcn/ui** component library (New York style)
- **Tailwind CSS** for utility-first styling
- **Radix UI** primitives for accessibility
- **CSS Variables** for theme customization
- **Glass morphism** effects for modern aesthetics

## Color Palette

### Theme: Violet

The application uses a violet-based color scheme that conveys professionalism, creativity, and trust.

### Light Mode Colors

#### Primary Colors
```css
--primary: 262.1 83.3% 57.8%        /* Vibrant violet - main brand color */
--primary-foreground: 210 20% 98%   /* Near white - text on primary */
```
**Usage:** Primary buttons, active states, links, brand elements
**Hex equivalent:** `#8b5cf6` (violet)

#### Background & Surface Colors
```css
--background: 0 0% 100%             /* Pure white - main background */
--foreground: 224 71.4% 4.1%        /* Very dark blue - main text */
--card: 0 0% 100%                   /* White - card backgrounds */
--card-foreground: 224 71.4% 4.1%   /* Dark blue - card text */
--surface: 220 14.3% 97%            /* Light gray - subtle surfaces */
--surface-variant: 220 14.3% 95%    /* Slightly darker gray - variant surfaces */
```

#### Secondary & Muted Colors
```css
--secondary: 220 14.3% 95.9%        /* Light gray - secondary elements */
--secondary-foreground: 220.9 39.3% 11%  /* Dark gray - text on secondary */
--muted: 220 14.3% 95.9%            /* Light gray - muted backgrounds */
--muted-foreground: 220 8.9% 46.1%  /* Medium gray - muted text */
--accent: 220 14.3% 95.9%           /* Light gray - accent backgrounds */
--accent-foreground: 220.9 39.3% 11%     /* Dark gray - accent text */
```

#### Semantic Colors
```css
--destructive: 0 84.2% 60.2%        /* Red - destructive actions */
--destructive-foreground: 210 20% 98%    /* White - text on destructive */
--success: 142 76% 36%              /* Green - success states (WCAG AA) */
--success-foreground: 355 100% 97%  /* Near white - text on success */
--info: 199 89% 48%                 /* Blue - informational states (WCAG AA) */
--info-foreground: 210 20% 98%      /* White - text on info */
--warning: 38 92% 50%               /* Orange - warning states (WCAG AA) */
--warning-foreground: 48 96% 89%    /* Light yellow - text on warning */
```
**Hex equivalents:**
- Destructive: `#ef4444` (red)
- Success: `#16a34a` (green)
- Info: `#0ea5e9` (blue)
- Warning: `#f59e0b` (orange)

#### Border & Input Colors
```css
--border: 220 13% 91%               /* Light gray - borders */
--input: 220 13% 91%                /* Light gray - input borders */
--ring: 262.1 83.3% 57.8%           /* Violet - focus rings */
```

### Dark Mode Colors

#### Primary Colors
```css
--primary: 263.4 70% 50.4%          /* Slightly darker violet for dark mode */
--primary-foreground: 210 20% 98%   /* Near white - text on primary */
```
**Hex equivalent:** `#7c3aed` (darker violet)

#### Background & Surface Colors
```css
--background: 224 71.4% 4.1%        /* Very dark blue - main background */
--foreground: 210 20% 98%           /* Near white - main text */
--card: 224 71.4% 4.1%              /* Dark blue - card backgrounds */
--card-foreground: 210 20% 98%      /* Near white - card text */
--surface: 215 27.9% 8%             /* Very dark gray - subtle surfaces */
--surface-variant: 215 27.9% 12%    /* Slightly lighter dark gray - variant surfaces */
```

#### Secondary & Muted Colors
```css
--secondary: 215 27.9% 16.9%        /* Dark gray - secondary elements */
--secondary-foreground: 210 20% 98% /* Near white - text on secondary */
--muted: 215 27.9% 16.9%            /* Dark gray - muted backgrounds */
--muted-foreground: 217.9 10.6% 64.9%    /* Medium gray - muted text */
--accent: 215 27.9% 16.9%           /* Dark gray - accent backgrounds */
--accent-foreground: 210 20% 98%    /* Near white - accent text */
```

#### Semantic Colors (Dark Mode Adjusted)
```css
--destructive: 0 62.8% 30.6%        /* Darker red for dark mode */
--destructive-foreground: 210 20% 98%    /* White - text on destructive */
--success: 142 71% 45%              /* Brighter green for visibility (WCAG AA) */
--success-foreground: 355 100% 97%  /* Near white - text on success */
--info: 199 89% 58%                 /* Brighter blue for visibility (WCAG AA) */
--info-foreground: 210 20% 98%      /* White - text on info */
--warning: 38 92% 60%               /* Brighter orange for visibility (WCAG AA) */
--warning-foreground: 48 96% 89%    /* Light yellow - text on warning */
```

#### Border & Input Colors
```css
--border: 215 27.9% 16.9%           /* Dark gray - borders */
--input: 215 27.9% 16.9%            /* Dark gray - input borders */
--ring: 263.4 70% 50.4%             /* Violet - focus rings */
```

### Chart Colors

#### Light Mode Charts
```css
--chart-1: 12 76% 61%               /* Coral red */
--chart-2: 173 58% 39%              /* Teal */
--chart-3: 197 37% 24%              /* Dark blue */
--chart-4: 43 74% 66%               /* Yellow */
--chart-5: 27 87% 67%               /* Orange */
```

#### Dark Mode Charts
```css
--chart-1: 220 70% 50%              /* Blue */
--chart-2: 160 60% 45%              /* Green */
--chart-3: 30 80% 55%               /* Orange */
--chart-4: 280 65% 60%              /* Purple */
--chart-5: 340 75% 55%              /* Pink */
```

### Dashboard Stat Card Colors

The dashboard uses gradient cards with specific color schemes for different metrics:

#### Emerald (Total Attendees)
```css
Light: from-emerald-50 to-emerald-100 border-emerald-200
Dark: from-emerald-950/50 to-emerald-900/50 border-emerald-800/50
Icon: bg-emerald-500/20 text-emerald-600 (light) / bg-emerald-400/20 text-emerald-400 (dark)
Text: text-emerald-700 (light) / text-emerald-300 (dark)
Value: text-emerald-900 (light) / text-emerald-100 (dark)
```

#### Purple (Credentials Printed)
```css
Light: from-purple-50 to-purple-100 border-purple-200
Dark: from-purple-950/50 to-purple-900/50 border-purple-800/50
Icon: bg-purple-500/20 text-purple-600 (light) / bg-purple-400/20 text-purple-400 (dark)
Text: text-purple-700 (light) / text-purple-300 (dark)
Value: text-purple-900 (light) / text-purple-100 (dark)
```

#### Amber (Photos Uploaded)
```css
Light: from-amber-50 to-amber-100 border-amber-200
Dark: from-amber-950/50 to-amber-900/50 border-amber-800/50
Icon: bg-amber-500/20 text-amber-600 (light) / bg-amber-400/20 text-amber-400 (dark)
Text: text-amber-700 (light) / text-amber-300 (dark)
Value: text-amber-900 (light) / text-amber-100 (dark)
```

## Typography

### Font Family
The application uses the system font stack for optimal performance and native feel:
```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

### Font Sizes & Weights

#### Headings
- **H1**: `text-4xl` (2.25rem / 36px) - `font-bold` (700)
- **H2**: `text-3xl` (1.875rem / 30px) - `font-bold` (700)
- **H3**: `text-2xl` (1.5rem / 24px) - `font-semibold` (600)
- **H4**: `text-xl` (1.25rem / 20px) - `font-semibold` (600)
- **H5**: `text-lg` (1.125rem / 18px) - `font-medium` (500)

#### Body Text
- **Large**: `text-lg` (1.125rem / 18px) - `font-normal` (400)
- **Base**: `text-base` (1rem / 16px) - `font-normal` (400)
- **Small**: `text-sm` (0.875rem / 14px) - `font-normal` (400)
- **Extra Small**: `text-xs` (0.75rem / 12px) - `font-normal` (400)

#### Special Text
- **Muted**: `text-muted-foreground` - Used for secondary information
- **Bold**: `font-bold` (700) - Used for emphasis
- **Medium**: `font-medium` (500) - Used for labels and semi-emphasis

## Spacing System

### Base Unit
The spacing system uses Tailwind's default spacing scale (0.25rem = 4px base unit).

### Common Spacing Values
- `gap-2` / `space-x-2` / `space-y-2`: 0.5rem (8px) - Tight spacing
- `gap-4` / `space-x-4` / `space-y-4`: 1rem (16px) - Default spacing
- `gap-6` / `space-x-6` / `space-y-6`: 1.5rem (24px) - Comfortable spacing
- `gap-8` / `space-x-8` / `space-y-8`: 2rem (32px) - Generous spacing

### Padding
- **Cards**: `p-4` (1rem / 16px) or `p-6` (1.5rem / 24px)
- **Buttons**: `px-4 py-2` (horizontal: 1rem, vertical: 0.5rem)
- **Inputs**: `px-3 py-2` (horizontal: 0.75rem, vertical: 0.5rem)
- **Container**: `padding: 2rem` (32px)

### Margins
- **Section spacing**: `mb-6` or `mb-8` (1.5rem - 2rem)
- **Element spacing**: `mb-4` (1rem)
- **Tight spacing**: `mb-2` (0.5rem)

## Border Radius

### Radius Values
```css
--radius: 0.5rem (8px) - Base radius
```

### Usage
- `rounded-lg`: `var(--radius)` (8px) - Default for cards, buttons
- `rounded-md`: `calc(var(--radius) - 2px)` (6px) - Slightly smaller
- `rounded-sm`: `calc(var(--radius) - 4px)` (4px) - Minimal rounding
- `rounded-full`: Full circle - Used for avatars, badges

## Shadows & Elevation

### Shadow Levels
- **Small**: `shadow-sm` - Subtle elevation for inputs
- **Medium**: `shadow-md` - Default card elevation
- **Large**: `shadow-lg` - Elevated cards, modals
- **Extra Large**: `shadow-xl` - Prominent elements

### Hover Effects
```css
hover:shadow-lg transition-all duration-300 hover:scale-105
```
Used on dashboard stat cards for interactive feedback.

## Glass Morphism Effect

### Glass Effect Utility
```css
.glass-effect {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.dark .glass-effect {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

**Usage:** Applied to cards and overlays for a modern, frosted glass appearance.

## Component Patterns

### Buttons

#### Primary Button
```tsx
<Button>
  <Icon className="mr-2 h-4 w-4" />
  Button Text
</Button>
```
- Background: `bg-primary`
- Text: `text-primary-foreground`
- Hover: Slightly darker primary
- Icon size: `h-4 w-4` (16px)
- Icon spacing: `mr-2` (8px)

#### Secondary/Outline Button
```tsx
<Button variant="outline">
  <Icon className="mr-2 h-4 w-4" />
  Button Text
</Button>
```
- Background: Transparent
- Border: `border-input`
- Text: `text-foreground`
- Hover: `bg-accent`

#### Destructive Button
```tsx
<Button variant="destructive">
  <Icon className="mr-2 h-4 w-4" />
  Delete
</Button>
```
- Background: `bg-destructive`
- Text: `text-destructive-foreground`
- Used for delete, remove, cancel actions

#### Ghost Button
```tsx
<Button variant="ghost">
  <Icon className="mr-2 h-4 w-4" />
  Action
</Button>
```
- Background: Transparent
- Hover: `bg-accent`
- Used for subtle actions

### Cards

#### Standard Card
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content
  </CardContent>
</Card>
```
- Background: `bg-card`
- Border: `border`
- Padding: `p-6` (header), `pt-6` (content)

#### Glass Effect Card
```tsx
<Card className="glass-effect">
  <CardContent>
    Content
  </CardContent>
</Card>
```
- Applies frosted glass effect
- Used for modern, elevated appearance

#### Gradient Stat Card
```tsx
<Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 dark:from-emerald-950/50 dark:to-emerald-900/50 dark:border-emerald-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
  <CardContent className="flex items-center p-4">
    <div className="p-3 rounded-lg bg-emerald-500/20 dark:bg-emerald-400/20">
      <Icon className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
    </div>
    <div className="ml-4">
      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Label</p>
      <p className="text-4xl font-bold text-emerald-900 dark:text-emerald-100">Value</p>
    </div>
  </CardContent>
</Card>
```
- Gradient background with color-specific variants
- Icon container with semi-transparent background
- Large, bold value display
- Hover effects for interactivity

### Inputs

#### Text Input
```tsx
<div className="relative">
  <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    placeholder="Placeholder..."
    className="pl-10 bg-background"
  />
</div>
```
- Height: `h-10` (40px)
- Padding: `px-3 py-2`
- Border: `border-input`
- Focus ring: `ring-ring`
- Icon positioning: Absolute left with padding adjustment

#### Select Dropdown
```tsx
<Select>
  <SelectTrigger className="w-48 bg-background">
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```
- Width: Typically `w-48` (192px) or custom
- Background: `bg-background`
- Dropdown: Elevated with shadow

### Badges

#### Default Badge
```tsx
<Badge>Label</Badge>
```
- Background: `bg-primary`
- Text: `text-primary-foreground`
- Padding: `px-2.5 py-0.5`
- Border radius: `rounded-full`

#### Secondary Badge
```tsx
<Badge variant="secondary">Label</Badge>
```
- Background: `bg-secondary`
- Text: `text-secondary-foreground`

#### Outline Badge
```tsx
<Badge variant="outline">Label</Badge>
```
- Background: Transparent
- Border: `border`
- Text: `text-foreground`

### Tables

#### Table Structure
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Column</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Data</TableCell>
    </TableRow>
  </TableBody>
</Table>
```
- Header: `bg-muted/50`
- Rows: Alternating with hover effect
- Borders: Subtle `border-border`
- Cell padding: `p-4`

### Dialogs & Modals

#### Dialog Structure
```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    <div className="space-y-6">
      Content
    </div>
  </DialogContent>
</Dialog>
```
- Overlay: Semi-transparent dark background
- Content: White card with shadow
- Max width: Varies by use case (`max-w-md`, `max-w-5xl`)
- Scrollable: `overflow-y-auto` for long content

### Tabs

#### Tab Structure
```tsx
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">
      <Icon className="mr-2 h-4 w-4" />
      Tab 1
    </TabsTrigger>
    <TabsTrigger value="tab2">
      <Icon className="mr-2 h-4 w-4" />
      Tab 2
    </TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">
    Content 1
  </TabsContent>
  <TabsContent value="tab2">
    Content 2
  </TabsContent>
</Tabs>
```
- Tab list: `bg-muted` background
- Active tab: `bg-background` with shadow
- Icons: `h-4 w-4` with `mr-2` spacing

## Animations & Transitions

### Standard Transitions
```css
transition-all duration-300
```
Used for smooth state changes on interactive elements.

### Hover Animations
```css
hover:scale-105 transition-all duration-300
```
Subtle scale effect on cards and buttons.

### Accordion Animations
```css
@keyframes accordion-down {
  from { height: 0 }
  to { height: var(--radix-accordion-content-height) }
}

@keyframes accordion-up {
  from { height: var(--radix-accordion-content-height) }
  to { height: 0 }
}
```
Smooth expand/collapse animations.

### Loading Spinners
```tsx
<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
```
Used for loading states in buttons and async operations.

## Accessibility

### WCAG Compliance
All semantic colors (success, info, warning, destructive) are designed to meet WCAG AA contrast ratio requirements:
- **Light mode**: Minimum 4.5:1 contrast ratio
- **Dark mode**: Adjusted brightness for visibility while maintaining contrast

### Focus States
- Focus ring: `ring-2 ring-ring ring-offset-2`
- Color: Matches primary color (`--ring`)
- Visible on all interactive elements

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Tab order follows logical flow
- Focus indicators are always visible

## Responsive Design

### Breakpoints
```javascript
screens: {
  "2xl": "1400px",
}
```
Uses Tailwind's default breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1400px (custom)

### Container
```css
container: {
  center: true,
  padding: "2rem",
  screens: {
    "2xl": "1400px",
  },
}
```

### Responsive Patterns
- Grid layouts: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Flex direction: `flex-col md:flex-row`
- Spacing: Adjust padding/margins at breakpoints
- Typography: Scale font sizes at breakpoints

## Icon System

### Icon Library
**Lucide React** - Consistent, modern icon set

### Icon Sizing
- **Extra Small**: `h-3 w-3` (12px) - Inline with small text
- **Small**: `h-4 w-4` (16px) - Default for buttons, inputs
- **Medium**: `h-5 w-5` (20px) - Larger buttons, headers
- **Large**: `h-6 w-6` (24px) - Prominent actions
- **Extra Large**: `h-8 w-8` (32px) - Dashboard stat cards

### Icon Spacing
- Button icons: `mr-2` (8px right margin)
- Label icons: `mr-2` (8px right margin)
- Icon-only buttons: No margin

### Icon Colors
- Default: `text-muted-foreground`
- Active: `text-foreground`
- Primary: `text-primary`
- Semantic: Match context (success, warning, etc.)

## Best Practices

### Color Usage
1. **Use semantic colors appropriately**: Success for positive actions, destructive for dangerous actions
2. **Maintain contrast**: Always ensure text is readable against backgrounds
3. **Consistent theming**: Use CSS variables for all colors to support dark mode
4. **Avoid color-only indicators**: Combine with icons or text for accessibility

### Spacing
1. **Consistent gaps**: Use `gap-2`, `gap-4`, `gap-6` for predictable spacing
2. **Breathing room**: Don't overcrowd elements
3. **Alignment**: Use flexbox/grid for proper alignment
4. **Responsive spacing**: Adjust spacing at breakpoints

### Typography
1. **Hierarchy**: Use heading sizes to establish visual hierarchy
2. **Line length**: Keep text lines between 45-75 characters for readability
3. **Line height**: Use default Tailwind line heights for optimal readability
4. **Font weights**: Use medium (500) for labels, bold (700) for emphasis

### Components
1. **Reuse shadcn/ui components**: Don't create custom components unless necessary
2. **Consistent patterns**: Follow established patterns for similar functionality
3. **Accessibility first**: Always include proper ARIA labels and keyboard navigation
4. **Mobile-friendly**: Test all components on mobile devices

### Performance
1. **Minimize custom CSS**: Use Tailwind utilities when possible
2. **Optimize images**: Use appropriate formats and sizes
3. **Lazy load**: Load heavy components only when needed
4. **Reduce animations**: Use subtle, performant animations

## Dark Mode Implementation

### Toggle Mechanism
Dark mode is controlled by adding/removing the `dark` class on the `<html>` element.

### Color Adaptation
All colors automatically adapt using CSS variables:
```css
.dark {
  --background: 224 71.4% 4.1%;
  /* ... other dark mode colors */
}
```

### Component Adaptation
Use Tailwind's `dark:` prefix for dark mode styles:
```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  Content
</div>
```

### Testing Dark Mode
Always test both light and dark modes to ensure:
- Proper contrast ratios
- Readable text
- Visible borders and dividers
- Appropriate hover states

## Common Patterns

### Search Bar with Icon
```tsx
<div className="relative w-64">
  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    placeholder="Search..."
    className="pl-10 bg-background"
  />
</div>
```

### Action Button Group
```tsx
<div className="flex items-center gap-2">
  <Button>
    <Plus className="mr-2 h-4 w-4" />
    Add
  </Button>
  <Button variant="outline">
    <Upload className="mr-2 h-4 w-4" />
    Import
  </Button>
  <Button variant="outline">
    <Download className="mr-2 h-4 w-4" />
    Export
  </Button>
</div>
```

### Stat Card with Icon
```tsx
<Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 dark:from-emerald-950/50 dark:to-emerald-900/50 dark:border-emerald-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
  <CardContent className="flex items-center p-4">
    <div className="p-3 rounded-lg bg-emerald-500/20 dark:bg-emerald-400/20">
      <Users className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
    </div>
    <div className="ml-4">
      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Label</p>
      <p className="text-4xl font-bold text-emerald-900 dark:text-emerald-100">123</p>
    </div>
  </CardContent>
</Card>
```

### Form Field with Label
```tsx
<div className="space-y-2">
  <Label htmlFor="field">Field Name</Label>
  <Input id="field" placeholder="Enter value..." />
</div>
```

### Loading State
```tsx
{isLoading ? (
  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
) : (
  <Icon className="mr-2 h-4 w-4" />
)}
```

## Conclusion

This design system provides a comprehensive foundation for building consistent, accessible, and beautiful interfaces in credential.studio. Always refer to this document when creating new components or modifying existing ones to maintain visual consistency across the application.

For component-specific implementations, refer to the shadcn/ui documentation and the existing codebase for examples.
