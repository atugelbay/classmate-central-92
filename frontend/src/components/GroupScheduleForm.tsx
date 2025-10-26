import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GroupScheduleFormProps {
  initialWeekdays?: number[];
  initialStartTime?: string;
  initialEndTime?: string;
  initialRoomId?: string;
  rooms: Array<{ id: string; name: string }>;
  onScheduleChange: (schedule: {
    weekdays: number[];
    startTime: string;
    endTime: string;
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
  initialStartTime = "10:00",
  initialEndTime = "11:30",
  initialRoomId = "",
  rooms,
  onScheduleChange,
}: GroupScheduleFormProps) {
  const [selectedDays, setSelectedDays] = useState<number[]>(initialWeekdays);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [roomId, setRoomId] = useState(initialRoomId);

  useEffect(() => {
    onScheduleChange({
      weekdays: selectedDays,
      startTime,
      endTime,
      roomId,
    });
  }, [selectedDays, startTime, endTime, roomId]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startTime">Время начала *</Label>
          <Input
            id="startTime"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="endTime">Время окончания *</Label>
          <Input
            id="endTime"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>
      </div>

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
        <p className="text-blue-800">
          {selectedDays.length > 0
            ? selectedDays
                .map((d) => WEEKDAYS.find((day) => day.value === d)?.label)
                .join(", ")
            : "Дни не выбраны"}{" "}
          {startTime && endTime && `${startTime}-${endTime}`}
        </p>
        {roomId && (
          <p className="text-blue-800 mt-1">
            Аудитория: {rooms.find((r) => r.id === roomId)?.name || roomId}
          </p>
        )}
      </div>
    </div>
  );
}

