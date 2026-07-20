'use client'

import { CalendarCell, CalendarGrid, CalendarGridBody } from 'react-aria-components/Calendar'
import type { DateValue } from 'react-aria-components/DateField'
import {
  RangeCalendar as RangeCalendarPrimitive,
  type RangeCalendarProps,
} from 'react-aria-components/RangeCalendar'
import { twJoin, twMerge } from 'tailwind-merge'
import { CalendarGridHeader, CalendarHeader } from './calendar'

export function RangeCalendar<T extends DateValue>({
  visibleDuration = { months: 1 },
  ...props
}: RangeCalendarProps<T>) {
  return (
    <RangeCalendarPrimitive
      data-slot="calendar"
      visibleDuration={visibleDuration}
      {...props}
      className={twMerge('w-fit rounded-2xl bg-white p-3 text-[#2D2022]', props.className as string | undefined)}
    >
      <CalendarHeader />
      <div className="flex snap-x items-start justify-stretch gap-6 overflow-auto sm:gap-10">
        {Array.from({ length: visibleDuration?.months ?? 1 }).map((_, index) => {
          const id = index + 1
          return (
            <CalendarGrid
              key={index}
              offset={id >= 2 ? { months: id - 1 } : undefined}
              className="border-separate border-spacing-0 [&_td]:px-0 [&_td]:py-0.5"
            >
              <CalendarGridHeader />
              <CalendarGridBody className="snap-start">
                {(date) => (
                  <CalendarCell
                    date={date}
                    className={({ isToday }) =>
                      twJoin(
                        'group/calendar-cell relative size-10 cursor-default leading-9 outline-none sm:size-9 sm:text-sm',
                        'selected:bg-[#FCE3E7] selected:text-[#7F1628]',
                        'selection-start:rounded-s-lg data-selection-end:rounded-e-lg data-outside-month:text-[rgba(45,32,34,0.28)]',
                        '[td:first-child_&]:rounded-s-lg [td:last-child_&]:rounded-e-lg',
                        isToday &&
                          'after:pointer-events-none after:absolute after:start-1/2 after:bottom-1 after:z-10 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-[#A91F34] selected:after:bg-white'
                      )
                    }
                  >
                    {({ formattedDate, isSelected, isSelectionStart, isSelectionEnd, isDisabled }) => (
                      <span
                        className={twMerge(
                          'flex size-full items-center justify-center rounded-lg tabular-nums forced-color-adjust-none',
                          isSelected && (isSelectionStart || isSelectionEnd)
                            ? 'bg-[#A91F34] text-white shadow-sm'
                            : isSelected
                              ? 'bg-[#A91F34]/50 text-white group-hover/calendar-cell:bg-[#A91F34]/60 group-pressed/calendar-cell:bg-[#A91F34]/70'
                              : 'group-hover/calendar-cell:bg-[#FFF4D6] group-pressed/calendar-cell:bg-[#FFE9A3]',
                          isDisabled && 'opacity-50'
                        )}
                      >
                        {formattedDate}
                      </span>
                    )}
                  </CalendarCell>
                )}
              </CalendarGridBody>
            </CalendarGrid>
          )
        })}
      </div>
    </RangeCalendarPrimitive>
  )
}
