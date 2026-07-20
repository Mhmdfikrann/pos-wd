'use client'

import {
  Button,
  CalendarGridHeader as CalendarGridHeaderPrimitive,
  CalendarHeaderCell,
  Heading,
} from 'react-aria-components'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function CalendarHeader() {
  return (
    <header data-slot="calendar-header" className="mb-3 flex items-center justify-between gap-2">
      <Button
        slot="previous"
        className="inline-flex size-8 items-center justify-center rounded-lg border border-[rgba(45,32,34,0.12)] bg-white text-[rgba(45,32,34,0.62)] outline-none transition-colors hover:bg-[#FFF9F2] focus-visible:ring-2 focus-visible:ring-[#A91F34]/25"
      >
        <ChevronLeft size={16} strokeWidth={2.4} />
      </Button>
      <Heading className="text-sm font-extrabold text-[#2D2022]" />
      <Button
        slot="next"
        className="inline-flex size-8 items-center justify-center rounded-lg border border-[rgba(45,32,34,0.12)] bg-white text-[rgba(45,32,34,0.62)] outline-none transition-colors hover:bg-[#FFF9F2] focus-visible:ring-2 focus-visible:ring-[#A91F34]/25"
      >
        <ChevronRight size={16} strokeWidth={2.4} />
      </Button>
    </header>
  )
}

export function CalendarGridHeader() {
  return (
    <CalendarGridHeaderPrimitive>
      {(day) => (
        <CalendarHeaderCell className="h-8 text-center text-[11px] font-bold text-[rgba(45,32,34,0.44)]">
          {day}
        </CalendarHeaderCell>
      )}
    </CalendarGridHeaderPrimitive>
  )
}
