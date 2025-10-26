import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronLeft, ChevronRight, Loader2, Clock, User, MapPin } from "lucide-react";
import { useLessons, useTeachers, useGroups } from "@/hooks/useData";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import "moment/locale/ru";

moment.locale("ru");

export function MiniCalendar() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const { data: lessons = [], isLoading } = useLessons();
  const { data: teachers = [] } = useTeachers();
  const { data: groups = [] } = useGroups();

  const monthStart = moment(selectedDate).startOf('month');
  const monthEnd = moment(selectedDate).endOf('month');
  const calendarStart = moment(monthStart).startOf('isoWeek');
  const calendarEnd = moment(monthEnd).endOf('isoWeek');

  const calendarDays: Date[] = [];
  let currentDay = calendarStart.clone();
  while (currentDay.isSameOrBefore(calendarEnd, 'day')) {
    calendarDays.push(currentDay.toDate());
    currentDay.add(1, 'day');
  }

  // Ensure lessons is an array
  const safeLessons = Array.isArray(lessons) ? lessons : [];
  
  const lessonsByDate: Record<string, typeof safeLessons> = {};
  safeLessons.forEach((lesson) => {
    const dateKey = moment(lesson.start).format('YYYY-MM-DD');
    if (!lessonsByDate[dateKey]) {
      lessonsByDate[dateKey] = [];
    }
    lessonsByDate[dateKey].push(lesson);
  });

  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const handlePreviousMonth = () => {
    setSelectedDate(moment(selectedDate).subtract(1, "month").toDate());
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setSelectedDate(moment(selectedDate).add(1, "month").toDate());
    setSelectedDay(null);
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setSelectedDay(today);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDay(date);
  };

  const getLoadColor = (count: number) => {
    if (count === 0) return "text-muted-foreground";
    if (count <= 2) return "text-green-600 font-semibold";
    if (count <= 4) return "text-yellow-600 font-semibold";
    return "text-red-600 font-semibold";
  };

  // Selected day lessons
  const selectedDayKey = selectedDay ? moment(selectedDay).format('YYYY-MM-DD') : null;
  const selectedDayLessons = selectedDayKey ? (lessonsByDate[selectedDayKey] || []) : [];

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle>Календарь занятий</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday}>
              Сегодня
            </Button>
            <Button variant="ghost" size="sm" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="text-lg font-semibold text-center">
          {moment(selectedDate).format("MMMM YYYY")}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Calendar Grid */}
            <div>
              {/* Week days header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day, index) => (
                  <div 
                    key={index} 
                    className="text-center text-xs font-semibold text-muted-foreground p-1"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  const dateKey = moment(day).format('YYYY-MM-DD');
                  const dayLessons = lessonsByDate[dateKey] || [];
                  const isToday = moment(day).isSame(moment(), 'day');
                  const isCurrentMonth = moment(day).isSame(selectedDate, 'month');
                  const isSelected = selectedDay && moment(day).isSame(moment(selectedDay), 'day');
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleDayClick(day)}
                      className={`
                        relative p-2 text-sm rounded-lg transition-all hover:scale-105 hover:shadow-md min-h-[50px] flex flex-col items-center justify-center
                        ${isToday ? 'ring-2 ring-primary font-bold bg-primary/10' : ''}
                        ${isSelected && !isToday ? 'ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-950' : ''}
                        ${!isCurrentMonth ? 'text-muted-foreground/30' : ''}
                        ${!isSelected && !isToday ? 'hover:bg-muted' : ''}
                      `}
                    >
                      <div className={isToday ? 'text-primary font-bold' : ''}>
                        {moment(day).format('D')}
                      </div>
                      {dayLessons.length > 0 && (
                        <div className={`text-xs ${getLoadColor(dayLessons.length)}`}>
                          {dayLessons.length}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-900" />
                  <span>1-2 урока</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-yellow-200 dark:bg-yellow-900" />
                  <span>3-4 урока</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-200 dark:bg-red-900" />
                  <span>5+ уроков</span>
                </div>
              </div>
            </div>

            {/* Selected Day Lessons */}
            <div className="border-l pl-4">
              {selectedDay ? (
                <div>
                  <div className="mb-3">
                    <h4 className="font-semibold text-lg">
                      {moment(selectedDay).format("D MMMM")}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedDayLessons.length} {selectedDayLessons.length === 1 ? 'урок' : 'уроков'}
                    </p>
                  </div>
                  
                  {selectedDayLessons.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {selectedDayLessons
                        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                        .map((lesson: any) => {
                          const teacher = teachers.find((t) => t.id === lesson.teacherId);
                          const group = groups.find((g) => g.id === lesson.groupId);
                          const isIndividual = lesson.lessonType === "individual" || !lesson.groupId;
                          const lessonName = isIndividual ? "Индивидуальный" : (group?.name || lesson.title);

                          return (
                            <div
                              key={lesson.id}
                              className="rounded-lg border p-3 hover:shadow-md cursor-pointer transition-all"
                              onClick={() => navigate('/schedule')}
                            >
                              <div className="flex items-start justify-between mb-1">
                                <h5 className="font-medium text-sm">{lessonName}</h5>
                                <Badge variant="outline" className="text-xs">
                                  {lesson.subject}
                                </Badge>
                              </div>
                              <div className="space-y-1 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    {moment(lesson.start).format("HH:mm")} - {moment(lesson.end).format("HH:mm")}
                                  </span>
                                </div>
                                {teacher && (
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    <span>{teacher.name}</span>
                                  </div>
                                )}
                                {lesson.room && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span>{lesson.room}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                      Нет уроков на этот день
                    </div>
                  )}
                  
                  <Button
                    className="w-full mt-3"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/schedule?date=${moment(selectedDay).format('YYYY-MM-DD')}`)}
                  >
                    Открыть расписание
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Выберите день для просмотра уроков
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
