import { useState } from "react";
import moment from "moment";
import "moment/locale/ru";
import { 
  useLessons, 
  useTeachers, 
  useStudents, 
  useGroups, 
  useLeadStats, 
  useAllBalances, 
  useDebts,
  useAllSubscriptions,
} from "@/hooks/useData";
import { StatCard } from "@/components/StatCard";
import { Calendar, Users, GraduationCap, BookOpen, Loader2, UserPlus, DollarSign, AlertCircle, Ticket, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";

moment.locale("ru");

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const { data: lessonsData, isLoading: lessonsLoading } = useLessons();
  const { data: teachersData, isLoading: teachersLoading } = useTeachers();
  const { data: studentsData, isLoading: studentsLoading } = useStudents();
  const { data: groupsData, isLoading: groupsLoading } = useGroups();
  const { data: leadStats } = useLeadStats();
  const { data: balances = [] } = useAllBalances();
  const { data: debts = [] } = useDebts();
  const { data: subscriptions = [] } = useAllSubscriptions();

  const lessons = lessonsData || [];
  const teachers = teachersData || [];
  const students = studentsData || [];
  const groups = groupsData || [];

  const isLoading = lessonsLoading || teachersLoading || studentsLoading || groupsLoading;

  const activeTeachers = teachers.filter((t) => t.status === "active").length;
  const upcomingLessons = lessons.filter(
    (l) => l.status === "scheduled" && new Date(l.start) > new Date()
  ).length;

  // New stats
  const newLeads = leadStats?.newLeads || 0;
  const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0);
  const pendingDebts = debts.filter(d => d.status === "pending").length;
  const activeSubscriptions = subscriptions.filter(s => s.status === "active").length;

  // Calendar navigation
  const handlePreviousMonth = () => {
    setSelectedDate(moment(selectedDate).subtract(1, "month").toDate());
  };

  const handleNextMonth = () => {
    setSelectedDate(moment(selectedDate).add(1, "month").toDate());
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // Calendar data
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

  const lessonsByDate: Record<string, typeof lessons> = {};
  lessons.forEach((lesson) => {
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

  const nextLessons = lessons
    .filter((l) => l.status === "scheduled" && new Date(l.start) > new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Обзор учебного процесса и ближайших событий
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="cursor-pointer" onClick={() => navigate("/teachers")}>
          <StatCard
            title="Всего учителей"
            value={activeTeachers}
            icon={GraduationCap}
          />
        </div>
        <div className="cursor-pointer" onClick={() => navigate("/students")}>
          <StatCard
            title="Всего учеников"
            value={students.length}
            icon={Users}
          />
        </div>
        <div className="cursor-pointer" onClick={() => navigate("/groups")}>
          <StatCard
            title="Активных групп"
            value={groups.length}
            icon={BookOpen}
          />
        </div>
        <div className="cursor-pointer" onClick={() => navigate("/schedule")}>
          <StatCard
            title="Уроков запланировано"
            value={upcomingLessons}
            icon={Calendar}
          />
        </div>
      </div>

      {/* New Stats Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="cursor-pointer" onClick={() => navigate("/leads")}>
          <StatCard
            title="Новые лиды"
            value={newLeads}
            icon={UserPlus}
          />
        </div>
        <div className="cursor-pointer" onClick={() => navigate("/finance")}>
          <StatCard
            title="Общий баланс"
            value={`${totalBalance.toLocaleString()} ₸`}
            icon={DollarSign}
          />
        </div>
        <div className="cursor-pointer" onClick={() => navigate("/finance")}>
          <StatCard
            title="Должников"
            value={pendingDebts}
            icon={AlertCircle}
          />
        </div>
        <div className="cursor-pointer" onClick={() => navigate("/subscriptions")}>
          <StatCard
            title="Активные абонементы"
            value={activeSubscriptions}
            icon={Ticket}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Календарь занятий</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday}>
                Сегодня
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="text-sm font-semibold ml-2">
                {moment(selectedDate).format("MMMM YYYY")}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-max">
                {/* Week days header */}
                <div className="grid grid-cols-7 border-b">
                  {weekDays.map((day, index) => (
                    <div 
                      key={index} 
                      className="h-10 flex items-center justify-center font-semibold text-sm border-r last:border-r-0"
                      style={{ minWidth: "120px" }}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="grid grid-cols-7 border-b last:border-b-0">
                    {week.map((day, dayIndex) => {
                      const dateKey = moment(day).format('YYYY-MM-DD');
                      const dayLessons = lessonsByDate[dateKey] || [];
                      const isToday = moment(day).isSame(moment(), 'day');
                      const isCurrentMonth = moment(day).isSame(selectedDate, 'month');
                      
                      return (
                        <div
                          key={dayIndex}
                          className={`border-r last:border-r-0 p-2 cursor-pointer transition-colors ${
                            isToday ? 'bg-blue-50' : ''
                          } ${!isCurrentMonth ? 'bg-gray-50/50' : 'hover:bg-gray-50'}`}
                          style={{ minWidth: "120px", minHeight: "100px" }}
                          onClick={() => navigate('/schedule')}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span 
                              className={`text-sm font-semibold ${
                                isToday 
                                  ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs' 
                                  : !isCurrentMonth 
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
                            {dayLessons.slice(0, 2).map((lesson) => (
                              <Card 
                                key={lesson.id} 
                                className="p-1 hover:shadow-md transition-shadow"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="text-xs font-semibold truncate">
                                  {lesson.title}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {moment(lesson.start).format("HH:mm")}
                                </div>
                              </Card>
                            ))}
                            {dayLessons.length > 2 && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div 
                                    className="text-xs text-muted-foreground text-center cursor-pointer hover:text-primary transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    +{dayLessons.length - 2} еще
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
                                            {lesson.title}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {moment(lesson.start).format("HH:mm")} - {moment(lesson.end).format("HH:mm")}
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

                          {dayLessons.length === 0 && isCurrentMonth && (
                            <div className="flex items-center justify-center h-12">
                              <p className="text-xs text-muted-foreground/30">—</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ближайшие уроки</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {nextLessons.map((lesson) => {
                const teacher = teachers.find((t) => t.id === lesson.teacherId);
                return (
                  <div
                    key={lesson.id}
                    className="flex flex-col gap-2 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium">{lesson.title}</h4>
                      <Badge variant="outline">{lesson.subject}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {teacher?.name}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {moment(lesson.start).format("DD MMM, HH:mm")}
                    </div>
                    <p className="text-sm text-muted-foreground">{lesson.room}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
