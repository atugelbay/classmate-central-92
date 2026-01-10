import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimePicker } from "@/components/TimePicker";

interface GroupScheduleFormProps {
  initialWeekdays?: number[];
  initialDayTimes?: Record<number, { start: string; end: string }>;
  initialStartTime?: string; // Для обратной совместимости
  initialEndTime?: string; // Для обратной совместимости
  initialRoomId?: string;
  rooms: Array<{ id: string; name: string }>;
  onScheduleChange: (schedule: {
    weekdays: number[];
    dayTimes: Record<number, { start: string; end: string }>;
    roomId: string;
  }) => void;
}

const WEEKDAYS = [
  { value: 1, label: "Пн" },
  { value: 2, label: "Вт" },
  { value: 3, label: "Ср" },
  { value: 4, label: "Чт" },
  { value: 5, label: "Пт" },
  { value: 6, label: "Сб" },
  { value: 0, label: "Вс" },
];

export function GroupScheduleForm({
  initialWeekdays = [],
  initialDayTimes,
  initialStartTime = "10:00",
  initialEndTime = "11:30",
  initialRoomId = "",
  rooms,
  onScheduleChange,
}: GroupScheduleFormProps) {
  const [selectedDays, setSelectedDays] = useState<number[]>(initialWeekdays);
  // Если initialDayTimes есть, используем его, иначе создаем из initialStartTime/initialEndTime для обратной совместимости
  const [dayTimes, setDayTimes] = useState<Record<number, { start: string; end: string }>>(() => {
    if (initialDayTimes) return initialDayTimes;
    const times: Record<number, { start: string; end: string }> = {};
    initialWeekdays.forEach(day => {
      times[day] = { start: initialStartTime, end: initialEndTime };
    });
    return times;
  });
  const [roomId, setRoomId] = useState(initialRoomId);

  useEffect(() => {
    onScheduleChange({
      weekdays: selectedDays,
      dayTimes,
      roomId,
    });
  }, [selectedDays, dayTimes, roomId]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => {
      const isCurrentlySelected = prev.includes(day);
      if (isCurrentlySelected) {
        // Удаляем день и его время
        setDayTimes((times) => {
          const newTimes = { ...times };
          delete newTimes[day];
          return newTimes;
        });
        return prev.filter((d) => d !== day).sort();
      } else {
        // Добавляем день с дефолтным временем
        const defaultTime = prev.length > 0 && dayTimes[prev[0]]
          ? dayTimes[prev[0]] // Используем время первого выбранного дня если есть
          : { start: initialStartTime, end: initialEndTime };
        setDayTimes((times) => ({
          ...times,
          [day]: defaultTime,
        }));
        return [...prev, day].sort();
      }
    });
  };

  const updateDayTime = (day: number, field: "start" | "end", value: string) => {
    setDayTimes((times) => ({
      ...times,
      [day]: {
        ...times[day],
        [field]: value,
      },
    }));
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-3 block">Дни недели *</Label>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => (
            <div key={day.value} className="flex items-center space-x-2">
              <Checkbox
                id={`day-${day.value}`}
                checked={selectedDays.includes(day.value)}
                onCheckedChange={() => toggleDay(day.value)}
              />
              <label
                htmlFor={`day-${day.value}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {day.label}
              </label>
            </div>
          ))}
        </div>
        {selectedDays.length === 0 && (
          <p className="text-sm text-destructive mt-2">
            Выберите хотя бы один день недели
          </p>
        )}
      </div>

      {/* Time Selection for Each Selected Day */}
      {selectedDays.length > 0 && (
        <div className="space-y-3 pt-2 border-t">
          <Label className="text-sm font-medium">Время занятий по дням *</Label>
          <div className="space-y-3">
            {selectedDays.map((day) => {
              const dayTime = dayTimes[day] || { start: initialStartTime, end: initialEndTime };
              const dayLabel = WEEKDAYS.find(d => d.value === day)?.label || "";
              return (
                <div key={day} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm">{dayLabel}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`start-${day}`} className="text-xs text-muted-foreground">
                        Начало
                      </Label>
                      <TimePicker
                        value={dayTime.start}
                        onChange={(value) => updateDayTime(day, "start", value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`end-${day}`} className="text-xs text-muted-foreground">
                        Окончание
                      </Label>
                      <TimePicker
                        value={dayTime.end}
                        onChange={(value) => updateDayTime(day, "end", value)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="roomId">Аудитория *</Label>
        <Select value={roomId} onValueChange={setRoomId} required>
          <SelectTrigger>
            <SelectValue placeholder="Выберите аудиторию" />
          </SelectTrigger>
          <SelectContent>
            {rooms.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                {room.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="p-3 bg-blue-50 rounded-lg text-sm">
        <p className="font-medium text-blue-900 mb-1">Предпросмотр расписания:</p>
        {selectedDays.length > 0 ? (
          <div className="text-blue-800 space-y-1">
            {Object.entries(dayTimes).map(([dayStr, time]) => {
              const day = parseInt(dayStr);
              if (!selectedDays.includes(day)) return null;
              const dayLabel = WEEKDAYS.find(d => d.value === day)?.label || "";
              return (
                <p key={day}>
                  {dayLabel}: {time.start}-{time.end}
                </p>
              );
            })}
          </div>
        ) : (
          <p className="text-blue-800">Дни не выбраны</p>
        )}
        {roomId && (
          <p className="text-blue-800 mt-1">
            Аудитория: {rooms.find((r) => r.id === roomId)?.name || roomId}
          </p>
        )}
      </div>
    </div>
  );
}

