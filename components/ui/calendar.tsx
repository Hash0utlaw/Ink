"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const NAV_BUTTON =
  "inline-flex h-9 w-9 items-center justify-center rounded border-1.5 border-ink bg-vellum text-ink transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2 relative",
        month: "flex flex-col w-full gap-4",
        nav: "flex items-center justify-between absolute inset-x-0 top-0 z-10",
        button_previous: NAV_BUTTON,
        button_next: NAV_BUTTON,
        month_caption: "flex justify-center items-center h-9",
        caption_label: "font-heading text-base text-ink",
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "text-ink-muted w-9 font-normal text-[13px]",
        week: "flex w-full mt-2",
        day: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 text-sm font-normal tabular-nums aria-selected:opacity-100"
        ),
        range_start: "rounded-l",
        range_end: "rounded-r",
        selected:
          "rounded bg-primary text-primary-foreground [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
        today: "rounded bg-secondary font-semibold text-ink",
        outside: "text-ink-muted opacity-60",
        disabled: "text-ink-muted opacity-50",
        range_middle: "bg-secondary text-ink",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
