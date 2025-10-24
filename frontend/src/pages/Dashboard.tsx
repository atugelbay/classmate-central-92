import { Calendar as BigCalendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
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
import { Calendar, Users, GraduationCap, BookOpen, Loader2, UserPlus, DollarSign, AlertCircle, Ticket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const localizer = momentLocalizer(moment);

export default function Dashboard() {
  const navigate = useNavigate();
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

  const events = lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    start: new Date(lesson.start),
    end: new Date(lesson.end),
    resource: lesson,
  }));

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
          <CardHeader>
            <CardTitle>Календарь занятий</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[500px]">
              <BigCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: "100%" }}
                views={["month", "week", "day"]}
                defaultView="week"
              />
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
