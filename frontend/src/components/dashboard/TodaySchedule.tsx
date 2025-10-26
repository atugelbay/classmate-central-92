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
        return "bg-green-500/10 text-green-600 border-green-200";
      case "scheduled":
        return "bg-blue-500/10 text-blue-600 border-blue-200";
      case "cancelled":
        return "bg-red-500/10 text-red-600 border-red-200";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-200";
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
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
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
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sortedLessons.length === 0 ? (
          <div className="flex h-[300px] flex-col items-center justify-center text-muted-foreground">
            <Calendar className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm">Нет уроков на сегодня</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
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
                  className={`rounded-lg border p-4 transition-all hover:shadow-md cursor-pointer ${
                    isNow ? "border-primary bg-primary/5 shadow-sm" : ""
                  } ${isPast ? "opacity-60" : ""}`}
                  onClick={() => navigate("/schedule")}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{lessonName}</h4>
                        {isNow && (
                          <Badge className="bg-green-500 text-white animate-pulse">
                            Сейчас
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {lesson.subject}
                        </Badge>
                        {isIndividual && (
                          <Badge variant="secondary" className="text-xs">
                            Индивидуальный
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getStatusColor(lesson.status)}`}
                    >
                      {getStatusLabel(lesson.status)}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {startTime.format("HH:mm")} - {endTime.format("HH:mm")}
                      </span>
                    </div>
                    
                    {teacher && (
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5" />
                        <span>{teacher.name}</span>
                      </div>
                    )}
                    
                    {isIndividual && studentNames && (
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5" />
                        <span className="text-xs">{studentNames}</span>
                      </div>
                    )}

                    {lesson.room && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{lesson.room}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

