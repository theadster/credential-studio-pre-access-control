import * as React from "react"
import { DashIcon } from "@radix-ui/react-icons"
import { OTPInput, OTPInputContext } from "input-otp"

import { cn } from "@/lib/utils"

function InputOTP({
  className,
  containerClassName,
  ref,
  ...props
}: React.ComponentProps<typeof OTPInput>) {
  return (
    <OTPInput
      ref={ref}
      containerClassName={cn(
        "flex items-center gap-2 has-[:disabled]:opacity-50",
        containerClassName
      )}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  )
}

function InputOTPGroup({
  className,
  ref,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div ref={ref} className={cn("flex items-center", className)} {...props} />
  )
}

function InputOTPSlot({
  index,
  className,
  ref,
  ...props
}: React.ComponentProps<"div"> & { index: number }) {
  const inputOTPContext = React.useContext(OTPInputContext)
  
  // Defensive guard: validate context and index
  if (!inputOTPContext || !inputOTPContext.slots || index < 0 || index >= inputOTPContext.slots.length) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[InputOTPSlot] Invalid context or index. Context: ${inputOTPContext ? 'present' : 'missing'}, Slots: ${inputOTPContext?.slots ? 'present' : 'missing'}, Index: ${index}, Slots length: ${inputOTPContext?.slots?.length ?? 'N/A'}`
      )
    }
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm shadow-xs transition-all first:rounded-l-md first:border-l last:rounded-r-md",
          className
        )}
        {...props}
      />
    )
  }

  const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index]

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm shadow-xs transition-all first:rounded-l-md first:border-l last:rounded-r-md",
        isActive && "z-10 ring-1 ring-ring",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  )
}

function InputOTPSeparator({
  ref,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div ref={ref} role="separator" {...props}>
      <DashIcon />
    </div>
  )
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
