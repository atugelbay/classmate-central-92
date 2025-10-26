import { useState } from "react";
import moment from "moment";
import "moment/locale/ru";
import { Lesson, Group } from "@/types";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

moment.locale("ru");

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
    const dateKey = moment.utc(lesson.start).local().format('YYYY-MM-DD');
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
    <div className="relative min-w-0">
      <div className="overflow-x-auto pb-4">
        <div className="min-w-max">
          {/* Week days header */}
          <div className="grid grid-cols-7 border-b">
            {weekDays.map((day, index) => (
              <div 
                key={index} 
                className="h-12 flex items-center justify-center font-semibold text-sm border-r last:border-r-0"
                style={{ minWidth: "140px" }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 border-b last:border-b-0">
              {week.map((day, dayIndex) => {
                const dayLessons = getDayLessons(day);
                const today = isToday(day);
                const currentMonth = isCurrentMonth(day);
                
                return (
                  <div
                    key={dayIndex}
                    className={`border-r last:border-r-0 p-2 cursor-pointer transition-colors ${
                      today ? 'bg-blue-50' : ''
                    } ${!currentMonth ? 'bg-gray-50/50' : 'hover:bg-gray-50'}`}
                    style={{ minWidth: "140px", minHeight: "120px" }}
                    onClick={() => handleDayClick(day)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span 
                        className={`text-sm font-semibold ${
                          today 
                            ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center' 
                            : !currentMonth 
                            ? 'text-muted-foreground' 
                            : ''
                        }`}
                      >
                        {moment(day).format('D')}
                      </span>
                      {dayLessons.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {dayLessons.length}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1">
                      {dayLessons.slice(0, 3).map((lesson) => (
                        <Card 
                          key={lesson.id} 
                          className="p-1.5 hover:shadow-md transition-shadow"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="text-xs font-semibold truncate">
                            {getGroupName(lesson.groupId) || lesson.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {moment.utc(lesson.start).local().format("HH:mm")}
                          </div>
                        </Card>
                      ))}
                      {dayLessons.length > 3 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <div 
                              className="text-xs text-muted-foreground text-center pt-1 cursor-pointer hover:text-primary transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              +{dayLessons.length - 3} еще
                            </div>
                          </PopoverTrigger>
                          <PopoverContent 
                            className="w-80"
                            side="right"
                            align="start"
                          >
                            <div className="space-y-3">
                              <h4 className="font-semibold text-sm">
                                Все уроки - {moment(day).format("D MMMM")} ({dayLessons.length})
                              </h4>
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {dayLessons.map((lesson) => (
                                  <Card 
                                    key={lesson.id} 
                                    className="p-2 hover:shadow-md transition-shadow"
                                  >
                                    <div className="text-sm font-semibold truncate">
                                      {getGroupName(lesson.groupId) || lesson.title}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {moment.utc(lesson.start).local().format("HH:mm")} - {moment.utc(lesson.end).local().format("HH:mm")}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {lesson.subject}
                                    </div>
                                    {lesson.room && (
                                      <Badge variant="outline" className="text-xs mt-1">
                                        {lesson.room}
                                      </Badge>
                                    )}
                                  </Card>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>

                    {dayLessons.length === 0 && currentMonth && (
                      <div className="flex items-center justify-center h-16">
                        <p className="text-xs text-muted-foreground/50">Нет уроков</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

