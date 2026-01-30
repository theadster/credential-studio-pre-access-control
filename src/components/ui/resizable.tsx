import { DragHandleDots2Icon } from "@radix-ui/react-icons"
import { Group, Panel, Separator } from "react-resizable-panels"
import { forwardRef } from "react"

import { cn } from "@/lib/utils"

const ResizablePanelGroup = forwardRef<
  React.ElementRef<typeof Group>,
  React.ComponentProps<typeof Group>
>(({ className, groupRef: _, ...props }, ref) => (
  <Group
    groupRef={ref}
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    {...props}
  />
))

const ResizablePanel = Panel

const ResizableHandle = forwardRef<
  React.ElementRef<typeof Separator>,
  React.ComponentProps<typeof Separator> & {
    withHandle?: boolean
  }
>(({ withHandle, className, children, elementRef, ...props }, ref) => (
  <Separator
    elementRef={elementRef ?? ref}
    className={cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
      className
    )}
    {...props}
  >
    {withHandle ? (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <DragHandleDots2Icon className="h-2.5 w-2.5" />
      </div>
    ) : (
      children
    )}
  </Separator>
))

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
