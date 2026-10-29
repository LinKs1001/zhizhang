import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, currentMonthKey, formatMonthZh } from '@/lib/date';

export function MonthSwitcher({ month, path }: { month: string; path: string }) {
  const atCurrent = month >= currentMonthKey();
  return (
    <div className="month-switcher">
      <Link href={`${path}?month=${addMonths(month, -1)}`} aria-label="上个月"><ChevronLeft size={15} /></Link>
      <span>{formatMonthZh(month)}</span>
      {atCurrent ? <span className="month-disabled" aria-hidden="true"><ChevronRight size={15} /></span> : <Link href={`${path}?month=${addMonths(month, 1)}`} aria-label="下个月"><ChevronRight size={15} /></Link>}
    </div>
  );
}
