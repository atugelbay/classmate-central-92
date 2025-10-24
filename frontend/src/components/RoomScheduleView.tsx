import { useState } from "react";
import { Room, Lesson, Teacher, Group } from "@/types";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import moment from "moment";
import "moment/locale/ru";

moment.locale("ru");

interface RoomScheduleViewProps {
  rooms: Room[];
  lessons: Lesson[];
  teachers: Teacher[];
  groups: Group[];
  selectedDate: Date;
  onLessonClick?: (lesson: Lesson) => void;
  onDateChange: (date: Date) => void;
}

export default function RoomScheduleView({
  rooms,
  lessons,
  teachers,
  groups,
  selectedDate,
  onLessonClick,
  onDateChange,
}: RoomScheduleViewProps) {
  // Time slots from 9:00 to 22:00 (every 30 minutes)
  const timeSlots: string[] = [];
  for (let hour = 9; hour <= 22; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, "0")}:00`);
    if (hour < 22) {
      timeSlots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
  }

  const handlePreviousDay = () => {
    const newDate = moment(selectedDate).subtract(1, "day").toDate();
    onDateChange(newDate);
  };

  const handleNextDay = () => {
    const newDate = moment(selectedDate).add(1, "day").toDate();
    onDateChange(newDate);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  // Filter lessons for selected date
  const filteredLessons = lessons.filter((lesson) => {
    const lessonDate = moment(lesson.start);
    return lessonDate.isSame(selectedDate, "day");
  });

  // Group lessons by room
  const lessonsByRoom: Record<string, Lesson[]> = {};
  rooms.forEach((room) => {
    lessonsByRoom[room.id] = filteredLessons.filter(
      (lesson) => lesson.roomId === room.id
    );
  });

  const getLessonPosition = (lesson: Lesson) => {
    const startTime = moment(lesson.start);
    const endTime = moment(lesson.end);
    
    const startHour = startTime.hour() + startTime.minute() / 60;
    const endHour = endTime.hour() + endTime.minute() / 60;
    
    const startOffset = ((startHour - 9) / 13) * 100; // 13 hours from 9 to 22
    const height = ((endHour - startHour) / 13) * 100;
    
    return { top: `${startOffset}%`, height: `${height}%` };
  };

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    return teacher?.name || "Unknown";
  };

  const getGroupName = (groupId?: string) => {
    if (!groupId) return null;
    const group = groups.find((g) => g.id === groupId);
    return group?.name;
  };

  const activeRooms = rooms?.filter((room) => room.status === "active") || [];

  return (
    <div className="space-y-4">
      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Сегодня
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h3 className="text-lg font-semibold">
          {moment(selectedDate).format("D MMMM YYYY, dddd")}
        </h3>
      </div>

      {/* Schedule Grid */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {/* Time Column */}
        <div className="flex-shrink-0 w-16">
          <div className="h-12 border-b" /> {/* Header spacer */}
          <div className="relative" style={{ height: "800px" }}>
            {timeSlots.map((time, index) => (
              <div
                key={time}
                className="absolute w-full text-xs text-muted-foreground pr-2 text-right"
                style={{ top: `${(index / timeSlots.length) * 100}%` }}
              >
                {time}
              </div>
            ))}
          </div>
        </div>

        {/* Room Columns */}
        {activeRooms.map((room) => (
          <div key={room.id} className="flex-shrink-0 w-64">
            {/* Room Header */}
            <div className="h-12 border-b flex items-center justify-center">
              <div className="text-center">
                <div className="font-semibold">{room.name}</div>
                <div className="text-xs text-muted-foreground">
                  Вместимость: {room.capacity}
                </div>
              </div>
            </div>

            {/* Room Schedule */}
            <div className="relative border-l" style={{ height: "800px" }}>
              {/* Time grid lines */}
              {timeSlots.map((time, index) => (
                <div
                  key={time}
                  className="absolute w-full border-t border-gray-100"
                  style={{ top: `${(index / timeSlots.length) * 100}%` }}
                />
              ))}

              {/* Lessons */}
              {lessonsByRoom[room.id]?.map((lesson) => {
                const position = getLessonPosition(lesson);
                const groupName = getGroupName(lesson.groupId);

                return (
                  <div
                    key={lesson.id}
                    className="absolute left-0 right-0 mx-1 cursor-pointer transition-all hover:shadow-lg hover:z-10"
                    style={{
                      top: position.top,
                      height: position.height,
                      minHeight: "40px",
                    }}
                    onClick={() => onLessonClick?.(lesson)}
                  >
                    <Card
                      className="h-full p-2 overflow-hidden border-l-4"
                      style={{ borderLeftColor: room.color }}
                    >
                      <div className="text-xs font-semibold truncate">
                        {lesson.title}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {getTeacherName(lesson.teacherId)}
                      </div>
                      {groupName && (
                        <div className="text-xs truncate">
                          <Badge variant="outline" className="text-xs">
                            {groupName}
                          </Badge>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {moment(lesson.start).format("HH:mm")} -{" "}
                        {moment(lesson.end).format("HH:mm")}
                      </div>
                    </Card>
                  </div>
                );
              })}

              {/* Empty state */}
              {lessonsByRoom[room.id]?.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Нет занятий</p>
                </div>
              )}
            </div>
          </div>
        ))}

        {activeRooms.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              Нет активных аудиторий. Создайте аудиторию в настройках.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

