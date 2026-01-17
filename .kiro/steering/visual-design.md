---
inclusion: always
---

# Visual Design System

Design rules for credential.studio. Uses shadcn/ui (New York style), Tailwind CSS, Radix UI primitives, CSS variables, and Lucide React icons.

## Color System

### CSS Variables (Light Mode)

| Variable | Value | Usage |
|----------|-------|-------|
| `--primary` | `262.1 83.3% 57.8%` (#8b5cf6) | Primary buttons, active states, links |
| `--primary-foreground` | `210 20% 98%` | Text on primary |
| `--background` | `0 0% 100%` | Main background |
| `--foreground` | `224 71.4% 4.1%` | Main text |
| `--card` | `0 0% 100%` | Card backgrounds |
| `--secondary` | `220 14.3% 95.9%` | Secondary elements |
| `--muted` | `220 14.3% 95.9%` | Muted backgrounds |
| `--muted-foreground` | `220 8.9% 46.1%` | Muted text |
| `--destructive` | `0 84.2% 60.2%` (#ef4444) | Destructive actions |
| `--success` | `142 76% 36%` (#16a34a) | Success states |
| `--info` | `199 89% 48%` (#0ea5e9) | Info states |
| `--warning` | `38 92% 50%` (#f59e0b) | Warning states |
| `--border` | `220 13% 91%` | Borders |
| `--ring` | `262.1 83.3% 57.8%` | Focus rings |

### CSS Variables (Dark Mode)

| Variable | Value | Usage |
|----------|-------|-------|
| `--primary` | `263.4 70% 50.4%` (#7c3aed) | Primary (darker violet) |
| `--background` | `224 71.4% 4.1%` | Dark background |
| `--foreground` | `210 20% 98%` | Light text |
| `--secondary` | `215 27.9% 16.9%` | Dark secondary |
| `--muted` | `215 27.9% 16.9%` | Dark muted |
| `--muted-foreground` | `217.9 10.6% 64.9%` | Medium gray text |
| `--destructive` | `0 62.8% 30.6%` | Darker red |
| `--success` | `142 71% 45%` | Brighter green |
| `--border` | `215 27.9% 16.9%` | Dark borders |

### Chart Colors
Light: `--chart-1` coral, `--chart-2` teal, `--chart-3` dark blue, `--chart-4` yellow, `--chart-5` orange
Dark: `--chart-1` blue, `--chart-2` green, `--chart-3` orange, `--chart-4` purple, `--chart-5` pink


## Dashboard Stat Card Gradients (CRITICAL - Use Exact Classes)

### Emerald (Total Attendees)
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

### Purple (Credentials Printed)
```tsx
<Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 dark:from-purple-950/50 dark:to-purple-900/50 dark:border-purple-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
  <CardContent className="flex items-center p-4">
    <div className="p-3 rounded-lg bg-purple-500/20 dark:bg-purple-400/20">
      <Icon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
    </div>
    <div className="ml-4">
      <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Label</p>
      <p className="text-4xl font-bold text-purple-900 dark:text-purple-100">Value</p>
    </div>
  </CardContent>
</Card>
```

### Amber (Photos Uploaded)
```tsx
<Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 dark:from-amber-950/50 dark:to-amber-900/50 dark:border-amber-800/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
  <CardContent className="flex items-center p-4">
    <div className="p-3 rounded-lg bg-amber-500/20 dark:bg-amber-400/20">
      <Icon className="h-8 w-8 text-amber-600 dark:text-amber-400" />
    </div>
    <div className="ml-4">
      <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Label</p>
      <p className="text-4xl font-bold text-amber-900 dark:text-amber-100">Value</p>
    </div>
  </CardContent>
</Card>
```

## Typography

| Element | Class | Size | Weight |
|---------|-------|------|--------|
| H1 | `text-4xl` | 36px | `font-bold` (700) |
| H2 | `text-3xl` | 30px | `font-bold` (700) |
| H3 | `text-2xl` | 24px | `font-semibold` (600) |
| H4 | `text-xl` | 20px | `font-semibold` (600) |
| H5 | `text-lg` | 18px | `font-medium` (500) |
| Body | `text-base` | 16px | `font-normal` (400) |
| Small | `text-sm` | 14px | `font-normal` (400) |
| XSmall | `text-xs` | 12px | `font-normal` (400) |

Font: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`


## Spacing & Layout

| Class | Value | Usage |
|-------|-------|-------|
| `gap-2` | 8px | Tight spacing |
| `gap-4` | 16px | Default spacing |
| `gap-6` | 24px | Comfortable spacing |
| `gap-8` | 32px | Generous spacing |
| `p-4` | 16px | Card padding |
| `p-6` | 24px | Large card padding |
| `px-4 py-2` | - | Button padding |
| `px-3 py-2` | - | Input padding |

### Border Radius
- `rounded-lg` (8px): Cards, buttons
- `rounded-md` (6px): Smaller elements
- `rounded-sm` (4px): Minimal
- `rounded-full`: Avatars, badges

### Shadows
- `shadow-sm`: Inputs
- `shadow-md`: Cards
- `shadow-lg`: Modals, elevated cards
- `shadow-xl`: Prominent elements

## Component Patterns

### Buttons
```tsx
// Primary
<Button><Icon className="mr-2 h-4 w-4" />Text</Button>

// Secondary/Outline
<Button variant="outline"><Icon className="mr-2 h-4 w-4" />Text</Button>

// Destructive
<Button variant="destructive"><Icon className="mr-2 h-4 w-4" />Delete</Button>

// Ghost
<Button variant="ghost"><Icon className="mr-2 h-4 w-4" />Action</Button>
```

### Cards
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### Input with Icon
```tsx
<div className="relative">
  <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input placeholder="Search..." className="pl-10 bg-background" />
</div>
```


### Dialogs (CRITICAL - Use Updated Styling)

The project uses a consistent dialog styling with slate header/footer backgrounds and prominent borders.

#### Standard Dialog Pattern
```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogTrigger asChild><Button>Open</Button></DialogTrigger>
  <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-0">
    <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-0 bg-[#F1F5F9] dark:bg-slate-800 px-6 pt-6">
      <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
        <Icon className="h-6 w-6" />
        Dialog Title
      </DialogTitle>
      <DialogDescription>Optional description text</DialogDescription>
    </DialogHeader>
    <div className="px-6 py-4 space-y-4">
      {/* Content */}
    </div>
    <DialogFooter className="px-6 pb-6 pt-4 border-t border-slate-200 dark:border-slate-700 bg-[#F1F5F9] dark:bg-slate-800">
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Dialog Styling Rules
| Element | Classes |
|---------|---------|
| DialogContent | `bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-0` |
| DialogHeader | `border-b border-slate-200 dark:border-slate-700 pb-4 mb-0 bg-[#F1F5F9] dark:bg-slate-800 px-6 pt-6` |
| DialogTitle | `text-2xl font-bold text-primary flex items-center gap-2` |
| DialogFooter | `px-6 pb-6 pt-4 border-t border-slate-200 dark:border-slate-700 bg-[#F1F5F9] dark:bg-slate-800` |
| Content area | `px-6 py-4` |

#### Common Width Variants
- Small dialogs: `max-w-md` or `max-w-sm`
- Medium dialogs: `max-w-xl` or `max-w-lg`
- Large dialogs: `max-w-4xl` or `max-w-5xl`
- Always include: `max-h-[90vh] overflow-y-auto`

#### AlertDialog Pattern (Destructive Actions)
```tsx
<AlertDialog open={open} onOpenChange={onOpenChange}>
  <AlertDialogContent className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl">
    <AlertDialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
      <AlertDialogTitle className="text-xl font-bold text-destructive">
        Delete Item
      </AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction className="bg-destructive text-destructive-foreground">
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

#### Key Styling Notes
- Header/footer use `bg-[#F1F5F9]` (light slate) in light mode
- `p-0` on DialogContent, then manual padding on sections for clean borders
- Title includes icon with `gap-2` spacing
- Border separators between header, content, and footer
- `shadow-2xl` for prominent elevation

### Tabs
```tsx
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1"><Icon className="mr-2 h-4 w-4" />Tab 1</TabsTrigger>
    <TabsTrigger value="tab2"><Icon className="mr-2 h-4 w-4" />Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

### Badges
- Default: `<Badge>Label</Badge>` - bg-primary
- Secondary: `<Badge variant="secondary">` - bg-secondary
- Outline: `<Badge variant="outline">` - transparent with border

### Tables
- Header: `bg-muted/50`
- Cell padding: `p-4`
- Borders: `border-border`

## Icons (Lucide React)

| Size | Class | Usage |
|------|-------|-------|
| XS | `h-3 w-3` | Inline with small text |
| SM | `h-4 w-4` | Buttons, inputs (default) |
| MD | `h-5 w-5` | Larger buttons, headers |
| LG | `h-6 w-6` | Prominent actions |
| XL | `h-8 w-8` | Dashboard stat cards |

Spacing: `mr-2` for button/label icons. Colors: `text-muted-foreground` (default), `text-primary`, semantic colors.

## Animations

- Standard: `transition-all duration-300`
- Hover scale: `hover:scale-105 transition-all duration-300`
- Loading: `<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />`

## Glass Morphism
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

## Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm:` | 640px | Mobile landscape |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Desktop |
| `xl:` | 1280px | Large desktop |
| `2xl:` | 1400px | Extra large |

Pattern: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

## Accessibility

- Focus ring: `ring-2 ring-ring ring-offset-2`
- All semantic colors meet WCAG AA (4.5:1 contrast)
- All interactive elements keyboard accessible
- Always include ARIA labels on icon-only buttons

## Dark Mode

Toggle via `dark` class on `<html>`. Use `dark:` prefix:
```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
```

## Best Practices Checklist

- [ ] Use semantic colors (`bg-primary`) not direct colors (`bg-blue-500`)
- [ ] All form inputs have `<Label>`
- [ ] Loading states use `<Skeleton>` or spinner
- [ ] Reuse shadcn/ui components
- [ ] Test both light and dark modes
- [ ] Mobile-friendly (test responsive)
