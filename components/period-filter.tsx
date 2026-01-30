'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useFinanceStore } from '@/hooks/use-finance-store'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns'
import { enUS, ptBR } from 'date-fns/locale'
import { translations } from '@/lib/i18n'

function PeriodFilterSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <Skeleton className="h-10 w-full sm:w-[140px]" />
      <div className="flex items-center gap-2 flex-1">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-6 flex-1" />
        <Skeleton className="h-10 w-10" />
      </div>
      <Skeleton className="h-10 w-full sm:w-20" />
    </div>
  )
}

export function PeriodFilter() {
  const { filterPeriod, setFilterPeriod, profile, isHydrated } =
    useFinanceStore()
  const t = (key: string) =>
    translations[profile.language || 'en'][
      key as keyof typeof translations.en
    ] || key

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const { type, date } = filterPeriod
    let newDate: Date

    switch (type) {
      case 'day':
        newDate = addDays(date, direction === 'next' ? 1 : -1)
        break
      case 'week':
        newDate = addWeeks(date, direction === 'next' ? 1 : -1)
        break
      case 'month':
        newDate = addMonths(date, direction === 'next' ? 1 : -1)
        break
      case 'year':
        newDate = addYears(date, direction === 'next' ? 1 : -1)
        break
      default:
        newDate = date
    }

    setFilterPeriod({ ...filterPeriod, date: newDate })
  }

  const getDateLabel = () => {
    const { type, date } = filterPeriod
    const locale = profile.language === 'pt' ? ptBR : enUS

    switch (type) {
      case 'day':
        return format(date, 'MMMM dd, yyyy', { locale })
      case 'week':
        return `${t('period.weekOf')} ${format(date, 'MM/dd/yyyy')}`
      case 'month':
        return format(date, 'MMMM yyyy', { locale })
      case 'year':
        return format(date, 'yyyy')
      default:
        return ''
    }
  }

  if (!isHydrated) {
    return <PeriodFilterSkeleton />
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <Select
        value={filterPeriod.type}
        onValueChange={(value) =>
          setFilterPeriod({
            ...filterPeriod,
            type: value as 'day' | 'week' | 'month' | 'year',
          })
        }
      >
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="day">{t('period.day')}</SelectItem>
          <SelectItem value="week">{t('period.week')}</SelectItem>
          <SelectItem value="month">{t('period.month')}</SelectItem>
          <SelectItem value="year">{t('period.year')}</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2 flex-1">
        <Button
          size="icon"
          variant="outline"
          onClick={() => navigatePeriod('prev')}
        >
          <ChevronLeft className="size-4" />
        </Button>

        <div className="flex-1 text-center font-medium capitalize">
          {getDateLabel()}
        </div>

        <Button
          size="icon"
          variant="outline"
          onClick={() => navigatePeriod('next')}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
