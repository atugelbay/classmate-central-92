import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, User, Loader2, ArrowRight, Users } from "lucide-react";
import { useTodayLessons, useTeachers, useGroups, useStudents } from "@/hooks/useData";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import "moment/locale/ru";

moment.locale("ru");

export function TodaySchedule() {
  const navigate = useNavigate();
  const { data: lessons = [], isLoading } = useTodayLessons();
  const { data: teachers = [] } = useTeachers();
  const { data: groups = [] } = useGroups();
  const { data: students = [] } = useStudents();

  // Sort lessons by start time - ensure lessons is an array
  const sortedLessons = Array.isArray(lessons) 
    ? [...lessons].sort((a, b) => {
        return new Date(a.start).getTime() - new Date(b.start).getTime();
      })
    : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "border";
      case "scheduled":
        return "border";
      case "cancelled":
        return "border";
      default:
        return "border";
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "completed":
        return { 
          backgroundColor: 'hsl(var(--dashboard-stat-positive-bg))',
          color: 'hsl(var(--dashboard-stat-positive))'
        };
      case "scheduled":
        return { 
          backgroundColor: 'hsl(var(--dashboard-stat-neutral-bg))',
          color: 'hsl(var(--dashboard-stat-neutral))'
        };
      case "cancelled":
        return { 
          backgroundColor: 'hsl(var(--dashboard-stat-negative-bg))',
          color: 'hsl(var(--dashboard-stat-negative))'
        };
      default:
        return { 
          backgroundColor: 'hsl(var(--dashboard-stat-neutral-bg))',
          color: 'hsl(var(--dashboard-stat-neutral))'
        };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Завершён";
      case "scheduled":
        return "Запланирован";
      case "cancelled":
        return "Отменён";
      default:
        return status;
    }
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" style={{ color: 'hsl(var(--dashboard-icon-muted))' }} />
          <CardTitle>Уроки на сегодня</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/schedule")}
          className="gap-1"
        >
          Все уроки
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sortedLessons.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <Calendar className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm">Нет уроков на сегодня</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-hidden flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
            {sortedLessons.map((lesson: any) => {
              const teacher = teachers.find((t) => t.id === lesson.teacherId);
              const group = groups.find((g) => g.id === lesson.groupId);
              const startTime = moment(lesson.start);
              const endTime = moment(lesson.end);
              const isNow = moment().isBetween(startTime, endTime);
              const isPast = moment().isAfter(endTime);
              
              // Determine lesson type and name
              const isIndividual = lesson.lessonType === "individual" || !lesson.groupId;
              const lessonName = isIndividual ? "Индивидуальный урок" : (group?.name || lesson.title);
              
              // Get student names for individual lessons
              let studentNames = "";
              if (isIndividual && lesson.studentIds && lesson.studentIds.length > 0) {
                const lessonStudents = students.filter(s => lesson.studentIds.includes(s.id));
                studentNames = lessonStudents.map(s => s.name).join(", ");
              }

              return (
                <div
                  key={lesson.id}
                  className={`rounded-lg border p-2.5 transition-all hover:shadow-md cursor-pointer ${
                    isNow ? "border-primary bg-primary/5 shadow-sm" : ""
                  } ${isPast ? "opacity-60" : ""}`}
                  onClick={() => navigate("/schedule")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className="font-semibold text-sm truncate">{lessonName}</h4>
                        {isNow && (
                          <Badge className="text-xs px-1.5 py-0 shrink-0" style={{ 
                            backgroundColor: 'hsl(var(--dashboard-stat-positive-bg))',
                            color: 'hsl(var(--dashboard-stat-positive))',
                            border: '1px solid hsl(var(--dashboard-stat-positive) / 0.3)'
                          }}>
                            Сейчас
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{startTime.format("HH:mm")} - {endTime.format("HH:mm")}</span>
                        </div>
                        {teacher && (
                          <div className="flex items-center gap-1 truncate">
                            <User className="h-3 w-3 shrink-0" />
                            <span className="truncate">{teacher.name}</span>
                          </div>
                        )}
                        {lesson.room && (
                          <div className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{lesson.room}</span>
                          </div>
                        )}
                      </div>
                      
                      {isIndividual && studentNames && (
                        <div className="text-xs text-muted-foreground truncate">
                          {studentNames}
                        </div>
                      )}
                    </div>
                    
                    <Badge
                      variant="outline"
                      className={`text-xs shrink-0 ${getStatusColor(lesson.status)}`}
                      style={getStatusStyle(lesson.status)}
                    >
                      {getStatusLabel(lesson.status)}
                    </Badge>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

