import { useState } from "react";
import moment from "moment";
import "moment/dist/locale/ru";
import { Lesson, Group } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface MonthScheduleViewProps {
  lessons: Lesson[];
  groups: Group[];
  selectedDate: Date;
  onDateClick?: (date: Date) => void;
}

export default function MonthScheduleView({
  lessons,
  groups,
  selectedDate,
  onDateClick,
}: MonthScheduleViewProps) {
  const monthStart = moment(selectedDate).startOf('month');
  const monthEnd = moment(selectedDate).endOf('month');
  const calendarStart = moment(monthStart).startOf('isoWeek');
  const calendarEnd = moment(monthEnd).endOf('isoWeek');

  // Generate calendar days
  const calendarDays: Date[] = [];
  let currentDay = calendarStart.clone();
  while (currentDay.isSameOrBefore(calendarEnd, 'day')) {
    calendarDays.push(currentDay.toDate());
    currentDay.add(1, 'day');
  }

  // Group lessons by date
  const lessonsByDate: Record<string, Lesson[]> = {};
  lessons.forEach((lesson) => {
    const dateKey = moment.parseZone(lesson.start as any).format('YYYY-MM-DD');
    if (!lessonsByDate[dateKey]) {
      lessonsByDate[dateKey] = [];
    }
    lessonsByDate[dateKey].push(lesson);
  });

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const getDayLessons = (date: Date) => {
    const dateKey = moment(date).format('YYYY-MM-DD');
    return lessonsByDate[dateKey] || [];
  };

  const getGroupName = (groupId?: string) => {
    if (!groupId) return null;
    const group = groups.find((g) => g.id === groupId);
    return group?.name;
  };

  const isToday = (date: Date) => {
    return moment(date).isSame(moment(), 'day');
  };

  const isCurrentMonth = (date: Date) => {
    return moment(date).isSame(selectedDate, 'month');
  };

  const handleDayClick = (date: Date) => {
    if (onDateClick) {
      onDateClick(date);
    }
  };

  // Organize calendar days into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className="relative w-full p-2 sm:p-4">
      <div className="w-full">
        {/* Week days header */}
        <div className="grid grid-cols-7 gap-px border-b">
          {weekDays.map((day, index) => (
            <div 
              key={index} 
              className="h-8 flex items-center justify-center font-semibold text-[10px] sm:text-xs text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-px">
            {week.map((day, dayIndex) => {
              const dayLessons = getDayLessons(day);
              const today = isToday(day);
              const currentMonth = isCurrentMonth(day);
              
              return (
                <div
                  key={dayIndex}
                  className={`p-1 sm:p-1.5 cursor-pointer transition-colors border-b border-r border-gray-100 dark:border-gray-800 ${
                    today 
                      ? 'bg-blue-50 dark:bg-blue-950/30' 
                      : !currentMonth 
                      ? 'bg-gray-50/50 dark:bg-gray-900/20' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-900/30'
                  }`}
                  style={{ minHeight: "70px" }}
                  onClick={() => handleDayClick(day)}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span 
                      className={`text-[10px] sm:text-xs font-semibold ${
                        today 
                          ? 'bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[9px]' 
                          : !currentMonth 
                          ? 'text-muted-foreground/50' 
                          : ''
                      }`}
                    >
                      {moment(day).format('D')}
                    </span>
                    {dayLessons.length > 0 && (
                      <span className="text-[8px] sm:text-[10px] font-semibold text-blue-600">
                        {dayLessons.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5 overflow-hidden">
                    {dayLessons.slice(0, 1).map((lesson) => (
                      <div 
                        key={lesson.id} 
                        className="p-0.5 sm:p-1 rounded text-[8px] sm:text-[9px] bg-blue-100 dark:bg-blue-900/30 truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="font-semibold truncate">
                          {getGroupName(lesson.groupId) || lesson.title}
                        </span>
                      </div>
                    ))}
                    {dayLessons.length > 1 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <div 
                            className="text-[8px] sm:text-[9px] text-blue-600 font-semibold text-center cursor-pointer hover:text-blue-800 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            +{dayLessons.length - 1}
                          </div>
                        </PopoverTrigger>
                        <PopoverContent 
                          className="w-72"
                          side="right"
                          align="start"
                        >
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm">
                              {moment(day).format("D MMMM")} ({dayLessons.length})
                            </h4>
                            <div className="space-y-1 max-h-64 overflow-y-auto">
                              {dayLessons.map((lesson) => (
                                <div 
                                  key={lesson.id} 
                                  className="p-2 rounded border-l-2 border-blue-500 bg-blue-50/50 dark:bg-blue-950/30"
                                >
                                  <div className="text-sm font-semibold truncate">
                                    {getGroupName(lesson.groupId) || lesson.title}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {moment.parseZone(lesson.start as any).format("HH:mm")} - {moment.parseZone(lesson.end as any).format("HH:mm")}
                                  </div>
                                  {lesson.subject && (
                                    <div className="text-xs text-muted-foreground truncate">
                                      {lesson.subject}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

