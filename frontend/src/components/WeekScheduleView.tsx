import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import "moment/dist/locale/ru";
import { Room, Lesson, Teacher, Group, Student, StudentSubscription } from "@/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Edit2, X, Clock, User, Users } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface WeekScheduleViewProps {
  rooms: Room[];
  lessons: Lesson[];
  teachers: Teacher[];
  groups: Group[];
  students: Student[];
  subscriptions?: StudentSubscription[];
  selectedDate: Date;
  onLessonClick?: (lesson: Lesson) => void;
  onSlotClick?: (start: Date, end: Date, roomId: string) => void;
  onLessonUpdate?: (lessonId: string, updates: { start: Date; end: Date; roomId?: string }) => void;
  unmarkedLessonIds?: Set<string>;
}

export default function WeekScheduleView({
  rooms,
  lessons,
  teachers,
  groups,
  students,
  subscriptions = [],
  selectedDate,
  onLessonClick,
  onSlotClick,
  onLessonUpdate,
  unmarkedLessonIds = new Set(),
}: WeekScheduleViewProps) {
  const navigate = useNavigate();
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [draggingLesson, setDraggingLesson] = useState<Lesson | null>(null);
  const [tempLessonPosition, setTempLessonPosition] = useState<{ start: Date; end: Date; roomId?: string } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ dayIndex: number; roomId: string } | null>(null);
  
  // Track mouse position to distinguish click from drag
  const [mouseDownPosition, setMouseDownPosition] = useState<{ x: number; y: number } | null>(null);
  const [hasActuallyMoved, setHasActuallyMoved] = useState(false);
  const [pendingDragLesson, setPendingDragLesson] = useState<Lesson | null>(null);
  const DRAG_THRESHOLD = 5; // pixels
  
  // Track container width for responsive column sizing
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Refs for robust global mouse/pointer end handling (prevents "sticky" drag)
  const draggingLessonRef = useRef<Lesson | null>(null);
  const pendingDragLessonRef = useRef<Lesson | null>(null);
  const handleLessonDragEndRef = useRef<() => void>(() => {});

  // Lessons can come as ISO strings; drag needs Date + safe comparisons
  const toDate = (v: any): Date => (v instanceof Date ? v : moment.parseZone(v as any).toDate());
  const toMs = (v: any): number => (v instanceof Date ? v.getTime() : moment.parseZone(v as any).valueOf());

  // Get week days (Monday to Sunday)
  const weekStart = moment(selectedDate).startOf('isoWeek');
  const weekDays = Array.from({ length: 7 }, (_, i) => 
    weekStart.clone().add(i, 'days').toDate()
  );

  // Time slots from 8:00 to 21:00 (every hour for week view)
  const timeSlots: string[] = [];
  for (let hour = 8; hour <= 21; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, "0")}:00`);
  }

  // Filter lessons for the week
  const weekEnd = moment(weekStart).endOf('isoWeek');
  const filteredLessons = lessons.filter((lesson) => {
    const lessonDate = moment.parseZone(lesson.start as any);
    return lessonDate.isBetween(weekStart, weekEnd, 'day', '[]');
  });

  // Group lessons by day and room
  const lessonsByDayAndRoom: Record<string, Record<string, Lesson[]>> = {};
  weekDays.forEach((day, index) => {
    lessonsByDayAndRoom[index] = {};
    rooms.forEach((room) => {
      lessonsByDayAndRoom[index][room.id] = filteredLessons.filter(
        (lesson) => {
          const lessonDate = moment.parseZone(lesson.start as any);
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

  // Get student status color based on remaining lessons
  const getStudentStatusColor = (studentId: string) => {
    // Find active subscriptions for this student
    const activeSubscriptions = subscriptions.filter(
      (sub) => sub.studentId === studentId && sub.status === "active"
    );

    if (activeSubscriptions.length === 0) {
      // No active subscription - check if there are any expired/completed subscriptions
      const expiredSubscriptions = subscriptions.filter(
        (sub) => sub.studentId === studentId && (sub.status === "expired" || sub.status === "completed")
      );
      if (expiredSubscriptions.length > 0) {
        return "bg-red-100 border-red-300 text-red-800"; // Red for expired/completed
      }
      return "bg-green-100 border-green-300 text-green-800"; // Default green if no subscription data
    }

    // Get the maximum lessonsRemaining from all active subscriptions
    const maxLessonsRemaining = Math.max(
      ...activeSubscriptions.map((sub) => sub.lessonsRemaining || 0)
    );

    if (maxLessonsRemaining === 0) {
      return "bg-red-100 border-red-300 text-red-800"; // Red for no lessons remaining
    } else if (maxLessonsRemaining === 1) {
      return "bg-yellow-100 border-yellow-300 text-yellow-800"; // Yellow for 1 lesson remaining
    } else {
      return "bg-green-100 border-green-300 text-green-800"; // Green for 2+ lessons remaining
    }
  };

  const activeRooms = rooms?.filter((room) => room.status === "active") || [];
  
  // Calculate responsive column width for days
  // Take into account: room name column, and padding to fit viewport
  const calculateDayColumnWidth = () => {
    if (containerWidth === 0) return 120;
    
    // Smaller room column on mobile (w-20 = 80px on mobile)
    const roomColumnWidth = containerWidth < 640 ? 80 : (containerWidth < 768 ? 112 : 128);
    const padding = containerWidth < 640 ? 10 : 20; // Smaller padding on mobile
    
    const availableWidth = containerWidth - roomColumnWidth - padding;
    const columnWidth = Math.floor(availableWidth / 7); // 7 days
    
    // Smaller minimum for mobile devices
    const minWidth = containerWidth < 640 ? 50 : 80;
    return Math.max(minWidth, columnWidth);
  };
  
  const dayColumnWidth = calculateDayColumnWidth();

  const handleLessonClick = (lesson: Lesson, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Don't open popover if the lesson was actually dragged
    if (hasActuallyMoved) {
      setHasActuallyMoved(false);
      setPendingDragLesson(null);
      setMouseDownPosition(null);
      return;
    }
    
    // Clean up drag states
    setPendingDragLesson(null);
    setMouseDownPosition(null);
    
    setSelectedLesson(lesson);
    setPopoverOpen(true);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedLesson && onLessonClick) {
      setPopoverOpen(false);
      onLessonClick(selectedLesson);
    }
  };

  const handleCellClick = (day: Date, roomId: string, e: React.MouseEvent) => {
    if (draggingLesson || !onSlotClick) return;
    
    // If popover is open, just close it instead of opening new dialog
    if (popoverOpen) {
      setPopoverOpen(false);
      return;
    }
    
    // Create a slot from 10:00 to 11:30
    const start = moment(day).hour(10).minute(0).second(0).toDate();
    const end = moment(day).hour(11).minute(30).second(0).toDate();
    onSlotClick(start, end, roomId);
  };

  // Lesson drag handlers
  const handleLessonDragStart = (lesson: Lesson, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Store initial mouse position
    setMouseDownPosition({ x: e.clientX, y: e.clientY });
    setHasActuallyMoved(false);
    setPendingDragLesson(lesson);
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
      setPendingDragLesson(null);
      setMouseDownPosition(null);
      return;
    }
    
    // Check if the lesson was actually moved (not just clicked)
    const startChanged = tempLessonPosition.start.getTime() !== toMs(draggingLesson.start);
    const endChanged = tempLessonPosition.end.getTime() !== toMs(draggingLesson.end);
    const roomChanged = tempLessonPosition.roomId !== draggingLesson.roomId;
    
    // Only update if position actually changed
    if (startChanged || endChanged || roomChanged) {
      onLessonUpdate(draggingLesson.id, {
        start: tempLessonPosition.start,
        end: tempLessonPosition.end,
        roomId: tempLessonPosition.roomId,
      });
    }
    
    setDraggingLesson(null);
    setTempLessonPosition(null);
    setHoveredCell(null);
    setPendingDragLesson(null);
    setMouseDownPosition(null);
  };

  // Keep refs in sync + provide robust global end handlers.
  useEffect(() => {
    draggingLessonRef.current = draggingLesson;
  }, [draggingLesson]);
  useEffect(() => {
    pendingDragLessonRef.current = pendingDragLesson;
  }, [pendingDragLesson]);
  useEffect(() => {
    handleLessonDragEndRef.current = handleLessonDragEnd;
  });

  useEffect(() => {
    const endAll = () => {
      if (draggingLessonRef.current) {
        handleLessonDragEndRef.current();
      }
      // Clean up pending drag if mouseup happened before threshold
      if (pendingDragLessonRef.current && !draggingLessonRef.current) {
        setPendingDragLesson(null);
        setMouseDownPosition(null);
        setHasActuallyMoved(false);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        endAll();
      }
    };

    // Use capture so stopPropagation() inside components can't block us.
    window.addEventListener("mouseup", endAll, { capture: true });
    window.addEventListener("pointerup", endAll, { capture: true });
    window.addEventListener("pointercancel", endAll, { capture: true });
    window.addEventListener("blur", endAll);
    window.addEventListener("mouseleave", endAll, { capture: true });
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("mouseup", endAll, { capture: true } as any);
      window.removeEventListener("pointerup", endAll, { capture: true } as any);
      window.removeEventListener("pointercancel", endAll, { capture: true } as any);
      window.removeEventListener("blur", endAll);
      window.removeEventListener("mouseleave", endAll, { capture: true } as any);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  // Check mouse movement distance to start dragging
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (pendingDragLesson && mouseDownPosition && !draggingLesson) {
        const dx = e.clientX - mouseDownPosition.x;
        const dy = e.clientY - mouseDownPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Start actual drag if moved beyond threshold
        if (distance > DRAG_THRESHOLD) {
          setHasActuallyMoved(true);
          setDraggingLesson(pendingDragLesson);
          setTempLessonPosition({ 
            start: pendingDragLesson.start, 
            end: pendingDragLesson.end, 
            roomId: pendingDragLesson.roomId 
          });
        }
      }
    };

    if (pendingDragLesson && !draggingLesson) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
      };
    }
  }, [pendingDragLesson, draggingLesson, mouseDownPosition, DRAG_THRESHOLD]);

  // pending-drag cleanup is handled by the global end listener above

  // Track container resize for responsive columns
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    
    // Initial measurement
    updateWidth();
    
    // Use ResizeObserver for better reactivity
    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    // Fallback to window resize
    window.addEventListener('resize', updateWidth);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative isolate w-full p-2 sm:p-4" 
      style={{ userSelect: draggingLesson ? 'none' : 'auto' }}
    >
      <div className="w-full">
        <div className="flex flex-col gap-1">
          {/* Header with days */}
          <div className="flex gap-1">
            <div className="flex-shrink-0 w-20 sm:w-24 z-[5]">
              <div className="h-12 sm:h-14 flex items-center justify-center font-semibold text-[10px] sm:text-xs px-1 border-b">
                Аудитория
              </div>
            </div>
            {weekDays.map((day, index) => {
              const isToday = moment(day).isSame(moment(), 'day');
              return (
                <div 
                  key={index} 
                  className="flex-1 min-w-0"
                >
                  <div 
                    className={`h-12 sm:h-14 flex flex-col items-center justify-center gap-0 py-1 border-b ${
                      isToday 
                        ? 'bg-blue-50 dark:bg-blue-950/30 border-b-2 border-blue-500' 
                        : ''
                    }`}
                  >
                    <div className={`text-[9px] leading-tight capitalize ${isToday ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-muted-foreground'}`}>
                      {moment(day).format('dd')}
                    </div>
                    <div className={`text-sm sm:text-base font-bold leading-tight ${isToday ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                      {moment(day).format('D')}
                    </div>
                    <div className={`text-[9px] leading-tight capitalize ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}>
                      {moment(day).format('MMM')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Room rows */}
          {activeRooms.map((room) => (
            <div key={room.id} className="flex gap-1">
              {/* Room name */}
              <div 
                className="flex-shrink-0 w-20 sm:w-24 z-[4] border-l-4"
                style={{ 
                  height: "70px",
                  borderLeftColor: room.color,
                  backgroundColor: `${room.color}10`
                }}
              >
                <div className="h-full flex flex-col items-center justify-center p-1 text-center">
                  <div className="font-semibold text-[10px] sm:text-xs truncate max-w-full px-1">
                    {room.name}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-muted-foreground">
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
                    className={`flex-1 min-w-0 p-0.5 sm:p-1 cursor-pointer transition-colors border-r border-gray-100 dark:border-gray-800 overflow-hidden ${
                      isToday 
                        ? 'bg-blue-50/30 dark:bg-blue-950/20 border-t-2 border-t-blue-500' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-900/30'
                    } ${isHovered && draggingLesson ? 'bg-blue-100/50 dark:bg-blue-900/30' : ''}`}
                    style={{ 
                      height: "70px",
                    }}
                    onClick={(e) => handleCellClick(day, room.id, e)}
                    onMouseEnter={() => {
                      if (draggingLesson) {
                        handleLessonDragMove(day, dayIndex, room.id);
                      }
                    }}
                  >
                    <div className="space-y-0.5 overflow-hidden h-full">
                      {/* Lessons as list */}
                      {sortedLessons.slice(0, 2).map((lesson) => {
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
                              <div
                                className={`p-0.5 sm:p-1 rounded border-l-2 cursor-pointer select-none overflow-hidden bg-white dark:bg-gray-800 shadow-sm ${
                                  isDragged ? 'opacity-50' : 'hover:shadow-md'
                                } ${
                                  lesson.status === 'cancelled' 
                                    ? 'opacity-50 grayscale'
                                    : unmarkedLessonIds.has(lesson.id)
                                    ? 'animate-pulse bg-red-50 dark:bg-red-950 border-red-500 ring-1 ring-red-400'
                                    : moment(lesson.start).isBefore(moment()) && lesson.status !== 'cancelled'
                                    ? 'opacity-60 grayscale'
                                    : ''
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
                                style={{ 
                                  userSelect: 'none',
                                  borderLeftColor: unmarkedLessonIds.has(lesson.id) ? '#ef4444' : room.color
                                }}
                              >
                                <div 
                                  className={`text-[8px] sm:text-[10px] font-semibold truncate leading-tight ${
                                    lesson.status === 'cancelled' ? 'line-through text-muted-foreground' : ''
                                  }`}
                                >
                                  {getGroupName(lesson.groupId) || lesson.title}
                                </div>
                                <div className="text-[7px] sm:text-[9px] text-muted-foreground truncate leading-tight">
                                  {moment.utc(lesson.start).local().format("HH:mm")}
                                </div>
                              </div>
                            </PopoverTrigger>
                            <PopoverContent 
                              className="w-80"
                              side="right"
                              align="center"
                              sideOffset={8}
                              collisionPadding={16}
                              onOpenAutoFocus={(e) => e.preventDefault()}
                            >
                              <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-lg">{getGroupName(lesson.groupId) || lesson.title}</h3>
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
                                      {moment.utc(lesson.start).local().format("HH:mm")} - {moment.utc(lesson.end).local().format("HH:mm")}
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

                                  {/* Students List */}
                                  {(() => {
                                    let lessonStudentIds: string[] = [];
                                    if (lesson.groupId) {
                                      const group = groups.find(g => g.id === lesson.groupId);
                                      if (group) {
                                        lessonStudentIds = group.studentIds || [];
                                      }
                                    }
                                    lessonStudentIds = [...new Set([...lessonStudentIds, ...(lesson.studentIds || [])])];

                                    return lessonStudentIds.length > 0 && (
                                      <div className="pt-2 border-t">
                                        <h3 className="text-sm font-semibold mb-2">Ученики ({lessonStudentIds.length})</h3>
                                        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                                          {lessonStudentIds.map(studentId => {
                                            const student = students.find(s => s.id === studentId);
                                            return student ? (
                                              <div
                                                key={studentId}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm cursor-pointer border transition-colors hover:opacity-80 ${getStudentStatusColor(studentId)}`}
                                                onClick={() => {
                                                  navigate(`/students/${student.id}`);
                                                  setPopoverOpen(false);
                                                }}
                                              >
                                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/50 text-xs font-semibold">
                                                  {student.name.charAt(0)}
                                                </div>
                                                <span>{student.name}</span>
                                              </div>
                                            ) : null;
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>

                                <div className="flex flex-col gap-2 pt-2">
                                  <Button onClick={handleEditClick}>
                                    <Edit2 className="h-4 w-4 mr-2" /> Редактировать урок
                                  </Button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        );
                      })}

                      {/* Show count if more than 2 lessons */}
                      {sortedLessons.length > 2 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <div 
                              className="text-[7px] sm:text-[9px] text-blue-600 font-semibold text-center cursor-pointer hover:text-blue-800 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              +{sortedLessons.length - 2}
                            </div>
                          </PopoverTrigger>
                          <PopoverContent 
                            className="w-72"
                            side="right"
                            align="start"
                          >
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm">
                                Все уроки ({sortedLessons.length})
                              </h4>
                              <div className="space-y-1 max-h-64 overflow-y-auto">
                                {sortedLessons.map((lesson) => {
                                  const teacher = teachers.find((t) => t.id === lesson.teacherId);
                                  const lessonRoom = rooms.find((r) => r.id === lesson.roomId);
                                  return (
                                    <div 
                                      key={lesson.id} 
                                      className={`p-2 rounded border-l-2 cursor-pointer bg-white dark:bg-gray-800 shadow-sm hover:shadow-md ${
                                        lesson.status === 'cancelled' 
                                          ? 'opacity-50 grayscale'
                                          : unmarkedLessonIds.has(lesson.id)
                                          ? 'animate-pulse bg-red-50 dark:bg-red-950 border-red-500'
                                          : moment(lesson.start).isBefore(moment()) && lesson.status !== 'cancelled'
                                          ? 'opacity-60 grayscale'
                                          : ''
                                      }`}
                                      style={{ borderLeftColor: unmarkedLessonIds.has(lesson.id) ? '#ef4444' : lessonRoom?.color }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedLesson(lesson);
                                        setPopoverOpen(true);
                                      }}
                                    >
                                      <div className={`text-sm font-semibold truncate ${lesson.status === 'cancelled' ? 'line-through' : ''}`}>
                                        {getGroupName(lesson.groupId) || lesson.title}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {moment.utc(lesson.start).local().format("HH:mm")} - {moment.utc(lesson.end).local().format("HH:mm")}
                                      </div>
                                      <div className="text-xs text-muted-foreground truncate">
                                        {teacher?.name}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}

                      {/* Ghost preview */}
                      {shouldShowGhost && tempLessonPosition && (
                        <div 
                          className="p-1 rounded border-l-2 border-dashed bg-white/80 dark:bg-gray-800/80 opacity-70"
                          style={{ borderLeftColor: room.color }}
                        >
                          <div className="text-[10px] font-semibold truncate">
                            {draggingLesson.title}
                          </div>
                          <div className="text-[9px] text-muted-foreground">
                            {moment(tempLessonPosition.start).format("HH:mm")}
                          </div>
                        </div>
                      )}

                      {/* Empty state */}
                      {sortedLessons.length === 0 && !shouldShowGhost && (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-[9px] text-muted-foreground/30">—</p>
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

