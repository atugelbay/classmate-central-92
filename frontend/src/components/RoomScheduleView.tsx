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

interface RoomScheduleViewProps {
  rooms: Room[];
  lessons: Lesson[];
  teachers: Teacher[];
  groups: Group[];
  selectedDate: Date;
  onLessonClick?: (lesson: Lesson) => void;
  onSlotClick?: (start: Date, end: Date, roomId: string) => void;
  onLessonUpdate?: (lessonId: string, updates: { start: Date; end: Date; roomId?: string }) => void;
}

export default function RoomScheduleView({
  rooms,
  lessons,
  teachers,
  groups,
  selectedDate,
  onLessonClick,
  onSlotClick,
  onLessonUpdate,
}: RoomScheduleViewProps) {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ timeSlot: string; roomId: string } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ timeSlot: string; roomId: string } | null>(null);
  
  // Lesson drag and resize states
  const [draggingLesson, setDraggingLesson] = useState<Lesson | null>(null);
  const [resizingLesson, setResizingLesson] = useState<{ lesson: Lesson; mode: 'top' | 'bottom' } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [tempLessonPosition, setTempLessonPosition] = useState<{ start: Date; end: Date; roomId?: string } | null>(null);
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);
  
  // Time slots from 9:00 to 22:00 (every 30 minutes)
  const timeSlots: string[] = [];
  for (let hour = 9; hour <= 22; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, "0")}:00`);
    if (hour < 22) {
      timeSlots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
  }

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

  const handleSlotMouseDown = (timeSlot: string, roomId: string) => {
    setIsDragging(true);
    setDragStart({ timeSlot, roomId });
    setDragEnd({ timeSlot, roomId });
  };

  const handleSlotMouseEnter = (timeSlot: string, roomId: string) => {
    if (isDragging && dragStart && dragStart.roomId === roomId) {
      setDragEnd({ timeSlot, roomId });
    }
  };

  const handleSlotMouseUp = () => {
    if (!isDragging || !dragStart || !dragEnd || !onSlotClick) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    // Calculate start and end times
    const startIndex = timeSlots.indexOf(dragStart.timeSlot);
    const endIndex = timeSlots.indexOf(dragEnd.timeSlot);
    
    const firstSlot = startIndex <= endIndex ? dragStart.timeSlot : dragEnd.timeSlot;
    const lastSlot = startIndex <= endIndex ? dragEnd.timeSlot : dragStart.timeSlot;
    const lastSlotIndex = startIndex <= endIndex ? endIndex : startIndex;
    
    const [startHour, startMinute] = firstSlot.split(":").map(Number);
    const start = moment(selectedDate)
      .hour(startHour)
      .minute(startMinute)
      .second(0)
      .millisecond(0)
      .toDate();
    
    // End time is the next slot after the last selected slot
    const nextSlotIndex = Math.min(lastSlotIndex + 1, timeSlots.length - 1);
    const [endHour, endMinute] = timeSlots[nextSlotIndex].split(":").map(Number);
    const end = moment(selectedDate)
      .hour(endHour)
      .minute(endMinute)
      .second(0)
      .millisecond(0)
      .toDate();
    
    onSlotClick(start, end, dragStart.roomId);
    
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const isSlotSelected = (timeSlot: string, roomId: string) => {
    if (!isDragging || !dragStart || !dragEnd || dragStart.roomId !== roomId) {
      return false;
    }
    
    const currentIndex = timeSlots.indexOf(timeSlot);
    const startIndex = timeSlots.indexOf(dragStart.timeSlot);
    const endIndex = timeSlots.indexOf(dragEnd.timeSlot);
    
    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);
    
    return currentIndex >= minIndex && currentIndex <= maxIndex;
  };

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

  // Calculate lesson duration in minutes
  const getLessonDuration = (lesson: Lesson) => {
    return moment(lesson.end).diff(moment(lesson.start), "minutes");
  };

  // Lesson drag handlers
  const handleLessonDragStart = (lesson: Lesson, e: React.MouseEvent, cardElement: HTMLElement) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingLesson(lesson);
    setTempLessonPosition({ start: lesson.start, end: lesson.end, roomId: lesson.roomId });
    setHoveredRoomId(lesson.roomId);
    
    // Calculate offset from the top of the card where user clicked
    const cardRect = cardElement.getBoundingClientRect();
    const offsetY = e.clientY - cardRect.top;
    setDragOffset({ x: 0, y: offsetY });
  };

  const handleLessonDragMove = (e: React.MouseEvent, roomElement: HTMLElement, roomId: string) => {
    if (!draggingLesson) return;
    
    setHoveredRoomId(roomId);
    
    const rect = roomElement.getBoundingClientRect();
    const totalHeight = rect.height;
    
    // Calculate the Y position where the top of the card should be
    // (mouse position - offset from where user clicked on the card)
    const cardTopY = e.clientY - rect.top - dragOffset.y;
    
    // Calculate time based on Y position
    const percentage = Math.max(0, Math.min(1, cardTopY / totalHeight));
    const totalMinutes = 13 * 60; // 9:00 to 22:00
    const minutesFromStart = Math.round(percentage * totalMinutes / 30) * 30; // Round to 30 min
    
    const duration = moment(draggingLesson.end).diff(moment(draggingLesson.start), 'minutes');
    
    const newStart = moment(selectedDate)
      .hour(9)
      .minute(0)
      .add(minutesFromStart, 'minutes')
      .toDate();
    
    const newEnd = moment(newStart).add(duration, 'minutes').toDate();
    
    setTempLessonPosition({ start: newStart, end: newEnd, roomId });
  };

  const handleLessonDragEnd = () => {
    if (!draggingLesson || !tempLessonPosition || !onLessonUpdate) {
      setDraggingLesson(null);
      setTempLessonPosition(null);
      setHoveredRoomId(null);
      return;
    }
    
    onLessonUpdate(draggingLesson.id, {
      start: tempLessonPosition.start,
      end: tempLessonPosition.end,
      roomId: tempLessonPosition.roomId,
    });
    
    setDraggingLesson(null);
    setTempLessonPosition(null);
    setHoveredRoomId(null);
  };

  // Lesson resize handlers
  const handleResizeStart = (lesson: Lesson, mode: 'top' | 'bottom', e: React.MouseEvent) => {
    e.stopPropagation();
    setResizingLesson({ lesson, mode });
    setTempLessonPosition({ start: lesson.start, end: lesson.end });
  };

  const handleResizeMove = (e: React.MouseEvent, roomElement: HTMLElement) => {
    if (!resizingLesson) return;
    
    const rect = roomElement.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalHeight = rect.height;
    
    const percentage = Math.max(0, Math.min(1, y / totalHeight));
    const totalMinutes = 13 * 60;
    const minutesFromStart = Math.round(percentage * totalMinutes / 30) * 30;
    
    const newTime = moment(selectedDate)
      .hour(9)
      .minute(0)
      .add(minutesFromStart, 'minutes')
      .toDate();
    
    if (resizingLesson.mode === 'top') {
      const minDuration = 30; // minimum 30 minutes
      const maxStart = moment(resizingLesson.lesson.end).subtract(minDuration, 'minutes').toDate();
      const newStart = newTime < maxStart ? newTime : maxStart;
      setTempLessonPosition({ start: newStart, end: resizingLesson.lesson.end });
    } else {
      const minEnd = moment(resizingLesson.lesson.start).add(30, 'minutes').toDate();
      const newEnd = newTime > minEnd ? newTime : minEnd;
      setTempLessonPosition({ start: resizingLesson.lesson.start, end: newEnd });
    }
  };

  const handleResizeEnd = () => {
    if (!resizingLesson || !tempLessonPosition || !onLessonUpdate) {
      setResizingLesson(null);
      setTempLessonPosition(null);
      return;
    }
    
    onLessonUpdate(resizingLesson.lesson.id, {
      start: tempLessonPosition.start,
      end: tempLessonPosition.end,
    });
    
    setResizingLesson(null);
    setTempLessonPosition(null);
  };

  // Add global mouseup handler to handle drag end
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mouseup', handleSlotMouseUp);
      return () => {
        document.removeEventListener('mouseup', handleSlotMouseUp);
      };
    }
  }, [isDragging, dragStart, dragEnd]);

  useEffect(() => {
    if (draggingLesson) {
      document.addEventListener('mouseup', handleLessonDragEnd);
      return () => {
        document.removeEventListener('mouseup', handleLessonDragEnd);
      };
    }
  }, [draggingLesson, tempLessonPosition]);

  useEffect(() => {
    if (resizingLesson) {
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizingLesson, tempLessonPosition]);

  return (
    <div 
      className="relative isolate min-w-0" 
      style={{ userSelect: (isDragging || draggingLesson || resizingLesson) ? 'none' : 'auto' }}
    >
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {/* Time Column */}
          <div className="flex-shrink-0 w-16 sticky left-0 z-[5] bg-background">
            <div className="h-12 border-b bg-background" /> {/* Header spacer */}
            <div className="relative bg-background" style={{ height: "800px" }}>
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
              <div className="h-12 border-b flex items-center justify-center bg-background relative z-[4]">
                <div className="text-center">
                  <div className="font-semibold">{room.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Вместимость: {room.capacity}
                  </div>
                </div>
              </div>

              {/* Room Schedule */}
              <div 
                className={`relative border-l transition-colors ${
                  draggingLesson && hoveredRoomId === room.id && draggingLesson.roomId !== room.id
                    ? 'bg-blue-50/30'
                    : ''
                }`}
                style={{ height: "800px" }}
                onMouseMove={(e) => {
                  const roomElement = e.currentTarget;
                  if (draggingLesson) {
                    handleLessonDragMove(e, roomElement, room.id);
                  }
                  if (resizingLesson && resizingLesson.lesson.roomId === room.id) {
                    handleResizeMove(e, roomElement);
                  }
                }}
              >
              {/* Time grid lines with click handlers */}
              {timeSlots.map((time, index) => {
                const isSelected = isSlotSelected(time, room.id);
                return (
                  <div
                    key={time}
                    className={`absolute w-full border-t border-gray-100 cursor-pointer transition-colors select-none ${
                      isSelected 
                        ? 'bg-blue-200/50' 
                        : 'hover:bg-blue-50/30'
                    }`}
                    style={{ 
                      top: `${(index / timeSlots.length) * 100}%`,
                      height: `${(1 / timeSlots.length) * 100}%`
                    }}
                    onMouseDown={() => {
                      if (!draggingLesson && !resizingLesson) {
                        handleSlotMouseDown(time, room.id);
                      }
                    }}
                    onMouseEnter={() => handleSlotMouseEnter(time, room.id)}
                  />
                );
              })}

              {/* Lessons */}
              {lessonsByRoom[room.id]?.map((lesson) => {
                // Use temp position if this lesson is being dragged or resized
                const isDragged = draggingLesson?.id === lesson.id;
                const isResized = resizingLesson?.lesson.id === lesson.id;
                
                // If lesson is being dragged to a different room, hide it in the original room
                if (isDragged && hoveredRoomId && hoveredRoomId !== room.id) {
                  return null;
                }
                
                const currentLesson = (isDragged || isResized) && tempLessonPosition 
                  ? { ...lesson, start: tempLessonPosition.start, end: tempLessonPosition.end }
                  : lesson;
                
                const position = getLessonPosition(currentLesson);
                const groupName = getGroupName(lesson.groupId);
                const duration = getLessonDuration(currentLesson);
                const teacher = teachers.find((t) => t.id === lesson.teacherId);

                // Adaptive display based on duration
                const showFullInfo = duration >= 90; // 1.5 hours or more
                const showMediumInfo = duration >= 60; // 1 hour or more
                const showMinimalInfo = duration < 60; // less than 1 hour

                return (
                  <Popover key={lesson.id} open={popoverOpen && selectedLesson?.id === lesson.id} onOpenChange={(open) => {
                    if (!open) setPopoverOpen(false);
                  }}>
                    <PopoverTrigger asChild>
                      <div
                        className={`absolute left-0 right-0 mx-1 transition-all hover:z-[3] z-[2] group select-none ${
                          isDragged || isResized ? 'cursor-move opacity-80' : 'cursor-pointer hover:shadow-lg'
                        }`}
                        style={{
                          top: position.top,
                          height: position.height,
                          minHeight: "40px",
                          userSelect: 'none',
                        }}
                        onClick={(e) => {
                          if (!isDragged && !isResized) {
                            handleLessonClick(lesson, e);
                          }
                        }}
                        onMouseDown={(e) => {
                          if (!isDragged && !isResized) {
                            handleLessonDragStart(lesson, e, e.currentTarget);
                          }
                        }}
                      >
                        {/* Top resize handle */}
                        <div
                          className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-400/30 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            handleResizeStart(lesson, 'top', e);
                          }}
                        />
                        
                        <Card
                          className="h-full overflow-hidden border-l-4"
                          style={{ 
                            borderLeftColor: room.color,
                            padding: showMinimalInfo ? "4px 6px" : "8px"
                          }}
                        >
                          {/* Title - always shown */}
                          <div 
                            className="font-semibold truncate"
                            style={{ fontSize: showMinimalInfo ? "10px" : "12px" }}
                          >
                            {lesson.title}
                          </div>

                          {/* Teacher name - shown for 1hr+ lessons */}
                          {showMediumInfo && (
                            <div className="text-xs text-muted-foreground truncate">
                              {teacher?.name}
                            </div>
                          )}

                          {/* Group badge - shown for 1.5hr+ lessons */}
                          {showFullInfo && groupName && (
                            <div className="mt-1">
                              <Badge variant="outline" className="text-xs">
                                {groupName}
                              </Badge>
                            </div>
                          )}

                          {/* Time - shown for 1hr+ lessons */}
                          {showMediumInfo && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {moment(currentLesson.start).format("HH:mm")} - {moment(currentLesson.end).format("HH:mm")}
                            </div>
                          )}
                        </Card>
                        
                        {/* Bottom resize handle */}
                        <div
                          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-400/30 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            handleResizeStart(lesson, 'bottom', e);
                          }}
                        />
                      </div>
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
                            <span className="text-muted-foreground">
                              ({duration} мин)
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{teacher?.name || "Не указан"}</span>
                          </div>

                          {groupName && (
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <Badge variant="outline">{groupName}</Badge>
                            </div>
                          )}

                          <div className="pt-2 border-t">
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">Аудитория:</span> {room.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">Статус:</span> {
                                lesson.status === "scheduled" ? "Запланирован" :
                                lesson.status === "completed" ? "Завершен" :
                                lesson.status === "cancelled" ? "Отменен" : lesson.status
                              }
                            </div>
                          </div>
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

              {/* Dragged lesson from another room (ghost preview) */}
              {draggingLesson && hoveredRoomId === room.id && draggingLesson.roomId !== room.id && tempLessonPosition && (
                <div
                  className="absolute left-0 right-0 mx-1 pointer-events-none opacity-70 z-[2]"
                  style={{
                    top: getLessonPosition({ 
                      ...draggingLesson, 
                      start: tempLessonPosition.start, 
                      end: tempLessonPosition.end 
                    }).top,
                    height: getLessonPosition({ 
                      ...draggingLesson, 
                      start: tempLessonPosition.start, 
                      end: tempLessonPosition.end 
                    }).height,
                    minHeight: "40px",
                  }}
                >
                  <Card
                    className="h-full overflow-hidden border-l-4 border-dashed"
                    style={{ 
                      borderLeftColor: room.color,
                      padding: "8px"
                    }}
                  >
                    <div className="font-semibold truncate text-xs">
                      {draggingLesson.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {teachers.find((t) => t.id === draggingLesson.teacherId)?.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {moment(tempLessonPosition.start).format("HH:mm")} - {moment(tempLessonPosition.end).format("HH:mm")}
                    </div>
                  </Card>
                </div>
              )}

              {/* Empty state */}
              {lessonsByRoom[room.id]?.length === 0 && !draggingLesson && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
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
    </div>
  );
}

