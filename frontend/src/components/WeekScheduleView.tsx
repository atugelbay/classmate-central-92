import { useState, useEffect } from "react";
import moment from "moment";
import "moment/locale/ru";
import { Room, Lesson, Teacher, Group } from "@/types";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Edit2, X, Clock, User, Users } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

moment.locale("ru");

interface WeekScheduleViewProps {
  rooms: Room[];
  lessons: Lesson[];
  teachers: Teacher[];
  groups: Group[];
  selectedDate: Date;
  onLessonClick?: (lesson: Lesson) => void;
  onSlotClick?: (start: Date, end: Date, roomId: string) => void;
  onLessonUpdate?: (lessonId: string, updates: { start: Date; end: Date; roomId?: string }) => void;
}

export default function WeekScheduleView({
  rooms,
  lessons,
  teachers,
  groups,
  selectedDate,
  onLessonClick,
  onSlotClick,
  onLessonUpdate,
}: WeekScheduleViewProps) {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [draggingLesson, setDraggingLesson] = useState<Lesson | null>(null);
  const [tempLessonPosition, setTempLessonPosition] = useState<{ start: Date; end: Date; roomId?: string } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ dayIndex: number; roomId: string } | null>(null);

  // Get week days (Monday to Sunday)
  const weekStart = moment(selectedDate).startOf('isoWeek');
  const weekDays = Array.from({ length: 7 }, (_, i) => 
    weekStart.clone().add(i, 'days').toDate()
  );

  // Time slots from 9:00 to 22:00 (every hour for week view)
  const timeSlots: string[] = [];
  for (let hour = 9; hour <= 22; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, "0")}:00`);
  }

  // Filter lessons for the week
  const weekEnd = moment(weekStart).endOf('isoWeek');
  const filteredLessons = lessons.filter((lesson) => {
    const lessonDate = moment(lesson.start);
    return lessonDate.isBetween(weekStart, weekEnd, 'day', '[]');
  });

  // Group lessons by day and room
  const lessonsByDayAndRoom: Record<string, Record<string, Lesson[]>> = {};
  weekDays.forEach((day, index) => {
    lessonsByDayAndRoom[index] = {};
    rooms.forEach((room) => {
      lessonsByDayAndRoom[index][room.id] = filteredLessons.filter(
        (lesson) => {
          const lessonDate = moment(lesson.start);
          return lessonDate.isSame(day, 'day') && lesson.roomId === room.id;
        }
      );
    });
  });

  const getGroupName = (groupId?: string) => {
    if (!groupId) return null;
    const group = groups.find((g) => g.id === groupId);
    return group?.name;
  };

  const activeRooms = rooms?.filter((room) => room.status === "active") || [];

  const handleLessonClick = (lesson: Lesson, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLesson(lesson);
    setPopoverOpen(true);
  };

  const handleEditClick = () => {
    if (selectedLesson && onLessonClick) {
      setPopoverOpen(false);
      onLessonClick(selectedLesson);
    }
  };

  const handleCellClick = (day: Date, roomId: string, e: React.MouseEvent) => {
    if (draggingLesson || !onSlotClick) return;
    
    // Create a slot from 10:00 to 11:30
    const start = moment(day).hour(10).minute(0).second(0).toDate();
    const end = moment(day).hour(11).minute(30).second(0).toDate();
    onSlotClick(start, end, roomId);
  };

  // Lesson drag handlers
  const handleLessonDragStart = (lesson: Lesson, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingLesson(lesson);
    setTempLessonPosition({ start: lesson.start, end: lesson.end, roomId: lesson.roomId });
  };

  const handleLessonDragMove = (
    day: Date, 
    dayIndex: number,
    roomId: string
  ) => {
    if (!draggingLesson) return;
    
    setHoveredCell({ dayIndex, roomId });
    
    // Keep the same time, just change the day and room
    const duration = moment(draggingLesson.end).diff(moment(draggingLesson.start), 'minutes');
    const originalTime = moment(draggingLesson.start);
    
    const newStart = moment(day)
      .hour(originalTime.hour())
      .minute(originalTime.minute())
      .second(0)
      .toDate();
    
    const newEnd = moment(newStart).add(duration, 'minutes').toDate();
    
    setTempLessonPosition({ start: newStart, end: newEnd, roomId });
  };

  const handleLessonDragEnd = () => {
    if (!draggingLesson || !tempLessonPosition || !onLessonUpdate) {
      setDraggingLesson(null);
      setTempLessonPosition(null);
      setHoveredCell(null);
      return;
    }
    
    onLessonUpdate(draggingLesson.id, {
      start: tempLessonPosition.start,
      end: tempLessonPosition.end,
      roomId: tempLessonPosition.roomId,
    });
    
    setDraggingLesson(null);
    setTempLessonPosition(null);
    setHoveredCell(null);
  };

  useEffect(() => {
    if (draggingLesson) {
      document.addEventListener('mouseup', handleLessonDragEnd);
      return () => {
        document.removeEventListener('mouseup', handleLessonDragEnd);
      };
    }
  }, [draggingLesson, tempLessonPosition]);

  return (
    <div 
      className="relative isolate min-w-0" 
      style={{ userSelect: draggingLesson ? 'none' : 'auto' }}
    >
      <div className="overflow-x-auto pb-4">
        <div className="min-w-max">
          {/* Header with days */}
          <div className="flex gap-0 border-b">
            <div className="flex-shrink-0 w-32 sticky left-0 z-[5] bg-background border-r">
              <div className="h-16 flex items-center justify-center font-semibold">
                Аудитория
              </div>
            </div>
            {weekDays.map((day, index) => {
              const isToday = moment(day).isSame(moment(), 'day');
              return (
                <div 
                  key={index} 
                  className={`flex-shrink-0 w-48 border-r ${isToday ? 'bg-blue-50' : ''}`}
                >
                  <div className="h-16 flex flex-col items-center justify-center">
                    <div className={`text-sm ${isToday ? 'text-blue-600 font-semibold' : 'text-muted-foreground'}`}>
                      {moment(day).format('dd')}
                    </div>
                    <div className={`text-lg font-semibold ${isToday ? 'text-blue-600' : ''}`}>
                      {moment(day).format('D')}
                    </div>
                    <div className={`text-xs ${isToday ? 'text-blue-600' : 'text-muted-foreground'}`}>
                      {moment(day).format('MMM')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Room rows */}
          {activeRooms.map((room) => (
            <div key={room.id} className="flex gap-0 border-b">
              {/* Room name */}
              <div className="flex-shrink-0 w-32 sticky left-0 z-[4] bg-background border-r">
                <div className="h-32 flex flex-col items-center justify-center p-2 text-center">
                  <div className="font-semibold text-sm">{room.name}</div>
                  <div 
                    className="w-3 h-3 rounded-full mt-1" 
                    style={{ backgroundColor: room.color }}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {room.capacity} мест
                  </div>
                </div>
              </div>

              {/* Day cells */}
              {weekDays.map((day, dayIndex) => {
                const isToday = moment(day).isSame(moment(), 'day');
                const dayLessons = lessonsByDayAndRoom[dayIndex][room.id] || [];
                
                // Sort lessons by start time
                const sortedLessons = [...dayLessons].sort((a, b) => 
                  moment(a.start).valueOf() - moment(b.start).valueOf()
                );
                
                // Check if we're hovering this cell with a dragged lesson from another cell
                const isHovered = hoveredCell?.dayIndex === dayIndex && hoveredCell?.roomId === room.id;
                const shouldShowGhost = draggingLesson && isHovered && 
                  (moment(draggingLesson.start).dayOfYear() !== moment(day).dayOfYear() || draggingLesson.roomId !== room.id);
                
                return (
                  <div 
                    key={dayIndex}
                    className={`flex-shrink-0 w-48 border-r p-2 cursor-pointer transition-colors ${
                      isToday ? 'bg-blue-50/30' : ''
                    } ${isHovered && draggingLesson ? 'bg-blue-100/50' : 'hover:bg-gray-50'}`}
                    style={{ minHeight: "120px" }}
                    onClick={(e) => handleCellClick(day, room.id, e)}
                    onMouseEnter={() => {
                      if (draggingLesson) {
                        handleLessonDragMove(day, dayIndex, room.id);
                      }
                    }}
                  >
                    <div className="space-y-1">
                      {/* Lessons as list */}
                      {sortedLessons.slice(0, 3).map((lesson) => {
                        const isDragged = draggingLesson?.id === lesson.id;
                        
                        // Hide original if being dragged to different day/room
                        if (isDragged && hoveredCell && 
                            (hoveredCell.dayIndex !== dayIndex || hoveredCell.roomId !== room.id)) {
                          return null;
                        }

                        return (
                          <Popover key={lesson.id} open={popoverOpen && selectedLesson?.id === lesson.id} onOpenChange={(open) => {
                            if (!open) setPopoverOpen(false);
                          }}>
                            <PopoverTrigger asChild>
                              <Card
                                className={`p-1.5 hover:shadow-md transition-shadow cursor-pointer select-none ${
                                  isDragged ? 'opacity-50' : ''
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isDragged) {
                                    handleLessonClick(lesson, e);
                                  }
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  if (!isDragged) {
                                    handleLessonDragStart(lesson, e);
                                  }
                                }}
                                style={{ userSelect: 'none' }}
                              >
                                <div className="text-xs font-semibold truncate">
                                  {lesson.title}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {moment(lesson.start).format("HH:mm")}
                                </div>
                              </Card>
                            </PopoverTrigger>
                            <PopoverContent 
                              className="w-80"
                              side="right"
                              align="start"
                              onOpenAutoFocus={(e) => e.preventDefault()}
                            >
                              <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-lg">{lesson.title}</h3>
                                    <p className="text-sm text-muted-foreground">{lesson.subject}</p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setPopoverOpen(false)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>

                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span>
                                      {moment(lesson.start).format("HH:mm")} - {moment(lesson.end).format("HH:mm")}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 text-sm">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span>{teachers.find(t => t.id === lesson.teacherId)?.name || "Не указан"}</span>
                                  </div>

                                  {lesson.groupId && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Users className="h-4 w-4 text-muted-foreground" />
                                      <Badge variant="outline">{getGroupName(lesson.groupId)}</Badge>
                                    </div>
                                  )}
                                </div>

                                <div className="flex gap-2 pt-2">
                                  <Button 
                                    onClick={handleEditClick}
                                    className="flex-1"
                                  >
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Редактировать
                                  </Button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        );
                      })}

                      {/* Show count if more than 3 lessons */}
                      {sortedLessons.length > 3 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <div 
                              className="text-xs text-muted-foreground text-center pt-1 cursor-pointer hover:text-primary transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              +{sortedLessons.length - 3} еще
                            </div>
                          </PopoverTrigger>
                          <PopoverContent 
                            className="w-80"
                            side="right"
                            align="start"
                          >
                            <div className="space-y-3">
                              <h4 className="font-semibold text-sm">
                                Все уроки ({sortedLessons.length})
                              </h4>
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {sortedLessons.map((lesson) => {
                                  const teacher = teachers.find((t) => t.id === lesson.teacherId);
                                  return (
                                    <Card 
                                      key={lesson.id} 
                                      className="p-2 cursor-pointer hover:shadow-md transition-shadow"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedLesson(lesson);
                                        setPopoverOpen(true);
                                      }}
                                    >
                                      <div className="text-sm font-semibold truncate">
                                        {lesson.title}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {moment(lesson.start).format("HH:mm")} - {moment(lesson.end).format("HH:mm")}
                                      </div>
                                      <div className="text-xs text-muted-foreground truncate">
                                        {teacher?.name}
                                      </div>
                                      {lesson.groupId && (
                                        <Badge variant="outline" className="text-xs mt-1">
                                          {getGroupName(lesson.groupId)}
                                        </Badge>
                                      )}
                                    </Card>
                                  );
                                })}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}

                      {/* Ghost preview */}
                      {shouldShowGhost && tempLessonPosition && (
                        <Card className="p-1.5 opacity-60 border-dashed">
                          <div className="text-xs font-semibold truncate">
                            {draggingLesson.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {moment(tempLessonPosition.start).format("HH:mm")}
                          </div>
                        </Card>
                      )}

                      {/* Empty state */}
                      {sortedLessons.length === 0 && !shouldShowGhost && (
                        <div className="flex items-center justify-center py-8">
                          <p className="text-xs text-muted-foreground/50">Нет уроков</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {activeRooms.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">
                Нет активных аудиторий.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

