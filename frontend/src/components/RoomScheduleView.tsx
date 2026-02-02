import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import moment from "moment";
import "moment/dist/locale/ru";
import "moment/dist/locale/kk";
import { Room, Lesson, Teacher, Group, Student, StudentSubscription } from "@/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Edit2, X, Clock, User, Users, Plus, MapPin } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface RoomScheduleViewProps {
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
  onCancelLesson?: (lesson: Lesson) => void;
  onResumeLesson?: (lesson: Lesson) => void;
  onOpenAttendance?: (lesson: Lesson) => void;
  unmarkedLessonIds?: Set<string>;
}

export default function RoomScheduleView({
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
  onCancelLesson,
  onResumeLesson,
  onOpenAttendance,
  unmarkedLessonIds = new Set(),
}: RoomScheduleViewProps) {
  const navigate = useNavigate();
  const { i18n } = useTranslation("schedule");
  moment.locale(i18n.language);
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
  
  // Track mouse position to distinguish click from drag
  const [mouseDownPosition, setMouseDownPosition] = useState<{ x: number; y: number } | null>(null);
  const [hasActuallyMoved, setHasActuallyMoved] = useState(false);
  const [pendingDragLesson, setPendingDragLesson] = useState<Lesson | null>(null);
  const DRAG_THRESHOLD = 5; // pixels
  
  // Track container width for responsive column sizing
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lessons can come as ISO strings; drag/resize needs Date + safe comparisons
  const toDate = (v: any): Date => (v instanceof Date ? v : moment.parseZone(v as any).toDate());
  const toMs = (v: any): number => (v instanceof Date ? v.getTime() : moment.parseZone(v as any).valueOf());

  // Refs for robust global mouse/pointer end handling (prevents "sticky" drag)
  const draggingLessonRef = useRef<Lesson | null>(null);
  const resizingLessonRef = useRef<{ lesson: Lesson; mode: 'top' | 'bottom' } | null>(null);
  const pendingDragLessonRef = useRef<Lesson | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const handleSlotMouseUpRef = useRef<() => void>(() => {});
  const handleLessonDragEndRef = useRef<() => void>(() => {});
  const handleResizeEndRef = useRef<() => void>(() => {});
  
  // Time slots from 8:00 to 21:00 (every hour)
  const timeSlots: string[] = [];
  for (let hour = 8; hour <= 21; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, "0")}:00`);
  }

  // Filter lessons for selected date
  const selectedDateKey = moment(selectedDate).format("YYYY-MM-DD");
  const filteredLessons = lessons.filter((lesson) => {
    // Фиксируем offset из строки/Date и не конвертируем в локаль пользователя
    const lessonDate = moment.parseZone(lesson.start as any);
    return lessonDate.format("YYYY-MM-DD") === selectedDateKey;
  });

  // Group lessons by room
  const lessonsByRoom: Record<string, Lesson[]> = {};
  rooms.forEach((room) => {
    lessonsByRoom[room.id] = filteredLessons.filter(
      (lesson) => lesson.roomId === room.id
    );
  });

  const getLessonPosition = (lesson: Lesson) => {
    const startTime = moment.parseZone(lesson.start as any);
    const endTime = moment.parseZone(lesson.end as any);
    
    const startHour = startTime.hour() + startTime.minute() / 60;
    const endHour = endTime.hour() + endTime.minute() / 60;
    
    // 14 hours from 8:00 to 22:00 - extra hour at end for lessons starting at 21:00
    const startOffset = ((startHour - 8) / 14) * 100;
    const height = ((endHour - startHour) / 14) * 100;
    
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

  const getDisplayStatus = (lesson: Lesson) => {
    if (lesson.status === "cancelled") return "Отменен";
    const now = moment();
    const start = moment.utc(lesson.start).local();
    const end = moment.utc(lesson.end).local();
    if (now.isBetween(start, end)) return "Проводится";
    if (now.isAfter(end)) return "Проведен";
    return "Запланирован";
  };

  const activeRooms = rooms?.filter((room) => room.status === "active") || [];
  
  // Calculate responsive column width
  // Take into account: time column, gaps, padding, and ensure it fits viewport
  const calculateColumnWidth = () => {
    if (activeRooms.length === 0 || containerWidth === 0) return 200;
    
    const timeColumnWidth = containerWidth < 640 ? 48 : 64; // Responsive time column
    const gapWidth = containerWidth < 640 ? 4 : 8; // sm: 8px (gap-2), mobile: 4px (gap-1)
    const totalGaps = (activeRooms.length) * gapWidth;
    const padding = 20; // Internal padding
    
    const availableWidth = containerWidth - timeColumnWidth - totalGaps - padding;
    const columnWidth = Math.floor(availableWidth / activeRooms.length);
    
    // Ensure minimum readability but prioritize fitting in viewport
    return Math.max(100, columnWidth);
  };
  
  const columnWidth = calculateColumnWidth();

  const handleSlotMouseDown = (timeSlot: string, roomId: string) => {
    // If popover is open, don't start dragging
    if (popoverOpen) {
      return;
    }
    
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

  // Calculate lesson duration in minutes
  const getLessonDuration = (lesson: Lesson) => {
    return moment.utc(lesson.end).diff(moment.utc(lesson.start), "minutes");
  };

  // Lesson drag handlers
  const handleLessonDragStart = (lesson: Lesson, e: React.MouseEvent, cardElement: HTMLElement) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Store initial mouse position
    setMouseDownPosition({ x: e.clientX, y: e.clientY });
    setHasActuallyMoved(false);
    setPendingDragLesson(lesson);
    
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
    const totalMinutes = 13 * 60; // 8:00 to 21:00
    const minutesFromStart = Math.round(percentage * totalMinutes / 30) * 30; // Round to 30 min
    
    const duration = moment(draggingLesson.end).diff(moment(draggingLesson.start), 'minutes');
    
    const newStart = moment(selectedDate)
      .hour(8)
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
    setHoveredRoomId(null);
    setPendingDragLesson(null);
    setMouseDownPosition(null);
  };

  // Lesson resize handlers
  const handleResizeStart = (lesson: Lesson, mode: 'top' | 'bottom', e: React.MouseEvent) => {
    e.stopPropagation();
    setResizingLesson({ lesson, mode });
    setTempLessonPosition({ start: toDate(lesson.start), end: toDate(lesson.end) });
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
      .hour(8)
      .minute(0)
      .add(minutesFromStart, 'minutes')
      .toDate();
    
    if (resizingLesson.mode === 'top') {
      const minDuration = 30; // minimum 30 minutes
      const maxStart = moment(resizingLesson.lesson.end).subtract(minDuration, 'minutes').toDate();
      const newStart = newTime < maxStart ? newTime : maxStart;
      setTempLessonPosition({ start: newStart, end: toDate(resizingLesson.lesson.end) });
    } else {
      const minEnd = moment(resizingLesson.lesson.start).add(30, 'minutes').toDate();
      const newEnd = newTime > minEnd ? newTime : minEnd;
      setTempLessonPosition({ start: toDate(resizingLesson.lesson.start), end: newEnd });
    }
  };

  const handleResizeEnd = () => {
    if (!resizingLesson || !tempLessonPosition || !onLessonUpdate) {
      setResizingLesson(null);
      setTempLessonPosition(null);
      return;
    }
    
    // Check if the lesson size was actually changed (not just clicked)
    const startChanged = tempLessonPosition.start.getTime() !== toMs(resizingLesson.lesson.start);
    const endChanged = tempLessonPosition.end.getTime() !== toMs(resizingLesson.lesson.end);
    
    // Only update if size actually changed
    if (startChanged || endChanged) {
      onLessonUpdate(resizingLesson.lesson.id, {
        start: tempLessonPosition.start,
        end: tempLessonPosition.end,
      });
    }
    
    setResizingLesson(null);
    setTempLessonPosition(null);
  };

  // Keep refs in sync + provide robust global end handlers.
  useEffect(() => {
    draggingLessonRef.current = draggingLesson;
  }, [draggingLesson]);
  useEffect(() => {
    resizingLessonRef.current = resizingLesson;
  }, [resizingLesson]);
  useEffect(() => {
    pendingDragLessonRef.current = pendingDragLesson;
  }, [pendingDragLesson]);
  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);
  useEffect(() => {
    handleSlotMouseUpRef.current = handleSlotMouseUp;
    handleLessonDragEndRef.current = handleLessonDragEnd;
    handleResizeEndRef.current = handleResizeEnd;
  });

  useEffect(() => {
    const endAll = () => {
      // End slot selection (creating a lesson)
      if (isDraggingRef.current) {
        handleSlotMouseUpRef.current();
      }
      // End lesson move/resize
      if (draggingLessonRef.current) {
        handleLessonDragEndRef.current();
      }
      if (resizingLessonRef.current) {
        handleResizeEndRef.current();
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
          setHoveredRoomId(pendingDragLesson.roomId);
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

  // pending-drag cleanup and resize end are handled by the global end listener above

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
      style={{ userSelect: (isDragging || draggingLesson || resizingLesson) ? 'none' : 'auto' }}
    >
      <div className="w-full">
        <div className="flex gap-1 sm:gap-2">
          {/* Time Column */}
          <div className="flex-shrink-0 w-12 sm:w-14 z-[5]">
            <div className="h-10 sm:h-12" /> {/* Header spacer */}
            <div className="relative" style={{ height: "calc(100vh - 380px)", minHeight: "280px" }}>
              {timeSlots.map((time) => {
                const [hour] = time.split(':').map(Number);
                const position = ((hour - 8) / 14) * 100; // 14 hours from 8:00 to 22:00
                return (
                  <div
                    key={time}
                    className="absolute w-full flex items-center justify-end pr-1"
                    style={{ top: `${position}%`, transform: 'translateY(-50%)' }}
                  >
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                      {time}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Room Columns - flex-1 to fill available space */}
          {activeRooms.map((room, index) => (
            <div 
              key={room.id} 
              className="flex-1 min-w-0"
            >
              {/* Room Header - Accented with icon */}
              <div 
                className="h-12 sm:h-14 rounded-lg flex items-center gap-2 px-3 relative z-[4] border-b-2"
                style={{
                  backgroundColor: `${room.color}10`,
                  borderBottomColor: room.color,
                }}
              >
                <div 
                  className="p-1.5 rounded-lg shrink-0"
                  style={{ backgroundColor: room.color }}
                >
                  <MapPin className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs sm:text-sm truncate text-slate-900 dark:text-slate-100">{room.name}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">
                    {room.capacity} {i18n.language === 'kk' ? 'орын' : i18n.language === 'en' ? 'seats' : 'мест'}
                  </div>
                </div>
              </div>

              {/* Room Schedule */}
              <div 
                className={`relative transition-colors ${
                  draggingLesson && hoveredRoomId === room.id && draggingLesson.roomId !== room.id
                    ? 'bg-blue-50/50 dark:bg-blue-950/20'
                    : ''
                }`}
                style={{ height: "calc(100vh - 380px)", minHeight: "280px" }}
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
              {/* Time grid lines with click handlers - Interactive hover */}
              {timeSlots.map((time) => {
                const isSelected = isSlotSelected(time, room.id);
                const [hour] = time.split(':').map(Number);
                const position = ((hour - 8) / 14) * 100; // 14 hours from 8:00 to 22:00
                const slotHeight = (1 / 14) * 100;
                return (
                  <div
                    key={time}
                    className={`absolute w-full transition-all select-none border-t border-gray-100 dark:border-gray-800 group/slot ${
                      isSelected 
                        ? 'bg-primary/20 dark:bg-primary/30 cursor-pointer z-[1]' 
                        : 'hover:bg-primary/5 dark:hover:bg-primary/10 cursor-pointer z-[1]'
                    }`}
                    style={{ 
                      top: `${position}%`,
                      height: `${slotHeight}%`,
                      pointerEvents: draggingLesson || resizingLesson ? 'none' : 'auto'
                    }}
                    onMouseDown={() => {
                      if (!draggingLesson && !resizingLesson) {
                        handleSlotMouseDown(time, room.id);
                      }
                    }}
                    onMouseEnter={() => handleSlotMouseEnter(time, room.id)}
                  >
                    {/* Plus button appears on hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity pointer-events-none">
                      <div className="p-1.5 rounded-lg bg-primary/10 dark:bg-primary/20 border border-primary/20">
                        <Plus className="h-3.5 w-3.5 text-primary" />
                      </div>
                    </div>
                  </div>
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
                const lessonRoom = rooms.find((r) => r.id === lesson.roomId);

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
                        className={`absolute left-1 right-1 transition-all hover:z-[10] z-[5] group select-none ${
                          isDragged || isResized ? 'cursor-move opacity-80 z-[15]' : 'cursor-pointer'
                        }`}
                        style={{
                          top: position.top,
                          height: position.height,
                          minHeight: "44px",
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
                          className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-400/30 opacity-0 group-hover:opacity-100 transition-opacity z-[20]"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            handleResizeStart(lesson, 'top', e);
                          }}
                        />
                        
                        {/* Lesson Card - Room-colored left border, fully adaptive content */}
                        <div
                          className={`h-full overflow-hidden rounded-lg border-l-4 bg-card shadow-sm transition-shadow flex flex-col ${
                            lesson.status === 'cancelled' 
                              ? 'opacity-50 grayscale' 
                              : unmarkedLessonIds.has(lesson.id)
                              ? 'animate-pulse bg-red-50 dark:bg-red-950/50 ring-2 ring-red-400'
                              : moment(lesson.start).isBefore(moment()) && lesson.status !== 'cancelled'
                              ? 'opacity-60'
                              : 'hover:shadow-lg'
                          }`}
                          style={{ 
                            borderLeftColor: unmarkedLessonIds.has(lesson.id) 
                              ? '#ef4444' 
                              : lessonRoom?.color || room.color,
                            padding: "6px 8px",
                          }}
                        >
                          {/* Group name - always shown, takes priority */}
                          <div 
                            className={`font-semibold truncate text-slate-900 dark:text-slate-100 leading-tight ${lesson.status === 'cancelled' ? 'line-through text-muted-foreground' : ''}`}
                            style={{ fontSize: "11px" }}
                          >
                            {groupName || lesson.title}
                          </div>

                          {/* Subject - shown if space allows */}
                          {showMediumInfo && lesson.subject && (
                            <div className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                              {lesson.subject}
                            </div>
                          )}

                          {/* Spacer to push time to bottom if there's extra space */}
                          <div className="flex-1 min-h-0" />

                          {/* Time - shown at bottom if space allows */}
                          {showMediumInfo && (
                            <div className="text-[9px] text-muted-foreground truncate leading-tight">
                              {moment.utc(currentLesson.start).local().format("HH:mm")} - {moment.utc(currentLesson.end).local().format("HH:mm")}
                            </div>
                          )}
                        </div>
                        
                        {/* Bottom resize handle */}
                        <div
                          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-400/30 opacity-0 group-hover:opacity-100 transition-opacity z-[20]"
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
                      align="center"
                      sideOffset={8}
                      collisionPadding={16}
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
                              {moment.utc(lesson.start).local().format("HH:mm")} - {moment.utc(lesson.end).local().format("HH:mm")}
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

                          <div className="pt-2 border-t">
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">Аудитория:</span> {lessonRoom?.name || "Не указана"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">Статус:</span> {getDisplayStatus(lesson)}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-2">
                          <Button onClick={handleEditClick}>
                            <Edit2 className="h-4 w-4 mr-2" /> Редактировать урок
                          </Button>
                          {lesson.status === "cancelled" ? (
                            <Button
                              variant="default"
                              onClick={(e) => { e.stopPropagation(); onResumeLesson && onResumeLesson(lesson); setPopoverOpen(false); }}
                            >
                              Возобновить урок
                            </Button>
                          ) : (
                            <Button
                              variant="destructive"
                              onClick={(e) => { e.stopPropagation(); onCancelLesson && onCancelLesson(lesson); setPopoverOpen(false); }}
                            >
                              Отменить урок
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            onClick={(e) => { e.stopPropagation(); onOpenAttendance && onOpenAttendance(lesson); setPopoverOpen(false); }}
                          >
                            Отметить посещаемость
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
                  className="absolute left-0 right-0 mx-1 pointer-events-none z-[8]"
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
                  {/* Ghost preview with target room color */}
                  <div
                    className="h-full overflow-hidden rounded-lg border-l-4 border-dashed bg-card/80 dark:bg-card/80 shadow-lg flex flex-col"
                    style={{ 
                      borderLeftColor: room.color,
                      padding: "6px 8px"
                    }}
                  >
                    <div className="font-semibold truncate text-[11px] text-slate-900 dark:text-slate-100 leading-tight">
                      {draggingLesson.title}
                    </div>
                    <div className="flex-1 min-h-0" />
                    <div className="text-[9px] text-muted-foreground leading-tight">
                      {moment(tempLessonPosition.start).format("HH:mm")} - {moment(tempLessonPosition.end).format("HH:mm")}
                    </div>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {lessonsByRoom[room.id]?.length === 0 && !draggingLesson && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-xs text-muted-foreground/50">
                    {i18n.language === 'kk' ? 'Сабақ жоқ' : i18n.language === 'en' ? 'No lessons' : 'Нет занятий'}
                  </p>
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

