import * as React from "react"
import { Check, ChevronDown, X, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface MultiSelectOption {
  label: string
  value: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const handleClearAll = () => {
    onChange([])
  }

  const getDisplayText = () => {
    if (selected.length === 0) {
      return placeholder
    }
    if (selected.length === 1) {
      const option = options.find((opt) => opt.value === selected[0])
      return option?.label || selected[0]
    }
    return `${selected.length} options selected`
  }

  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    const trimmedQuery = searchQuery.trim()
    if (!trimmedQuery) return options
    const query = trimmedQuery.toLowerCase()
    return options.filter((option) =>
      option.label.toLowerCase().includes(query)
    )
  }, [options, searchQuery])

  // Reset search when popover closes
  React.useEffect(() => {
    if (!open) {
      setSearchQuery("")
    }
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-10 bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800",
            selected.length === 0 && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        {/* Search input */}
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Search options..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 border-0 bg-transparent px-0 py-3 text-sm outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
          />
        </div>

        {/* Scrollable options list using Radix ScrollArea */}
        <ScrollArea className="h-[300px]">
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No option found.
            </div>
          ) : (
            <div className="p-1">
              {filteredOptions.map((option) => {
                const isSelected = selected.includes(option.value)
                return (
                  <div
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent/50"
                    )}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </div>
                    <span className={cn(isSelected && "font-medium")}>
                      {option.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer with selection count and clear button */}
        {selected.length > 0 && (
          <>
            <Separator />
            <div className="p-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {selected.length} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={(e) => {
                  e.preventDefault()
                  handleClearAll()
                }}
              >
                <X className="mr-1 h-3 w-3" />
                Clear all
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
