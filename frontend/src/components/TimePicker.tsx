import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, ChevronDown, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string; // "HH:mm"
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

const MINUTE_OPTIONS = ["00", "15", "30", "45"] as const;

function clampHour(h: number) {
  if (Number.isNaN(h)) return 0;
  return Math.min(23, Math.max(0, h));
}

function parseTime(value: string): { hour: number; minute: string } {
  const [hRaw, mRaw] = (value || "").split(":");
  const hour = clampHour(Number(hRaw));
  const minute = (MINUTE_OPTIONS as readonly string[]).includes(mRaw) ? mRaw : "00";
  return { hour, minute };
}

function formatTime(hour: number, minute: string) {
  return `${String(clampHour(hour)).padStart(2, "0")}:${minute}`;
}

function addMinutes(value: string, deltaMinutes: number): string {
  const { hour, minute } = parseTime(value);
  const total = hour * 60 + Number(minute) + deltaMinutes;
  const wrapped = ((total % 1440) + 1440) % 1440;
  const nextHour = Math.floor(wrapped / 60);
  const nextMinute = String(wrapped % 60).padStart(2, "0");
  // Snap to 15-min increments
  const snappedMinute =
    (MINUTE_OPTIONS as readonly string[]).includes(nextMinute) ? nextMinute : "00";
  return formatTime(nextHour, snappedMinute);
}

export function TimePicker({ value, onChange, disabled = false, className }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const { hour, minute } = useMemo(() => parseTime(value), [value]);

  const hourListRef = useRef<HTMLDivElement>(null);

  // Скроллим к выбранному часу при открытии
  useEffect(() => {
    if (!open) return;
    const root = hourListRef.current;
    if (!root) return;
    const el = root.querySelector(`[data-hour="${hour}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "center" });
  }, [open, hour]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-between text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{value || "Выберите время"}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[280px] p-3"
        align="start"
        // важно: даём колесику скроллить ScrollArea, но не скроллить страницу под поповером
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">Время</div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onChange(addMinutes(value || "00:00", -15))}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="text-sm font-mono text-muted-foreground min-w-[52px] text-center">
              {formatTime(hour, minute)}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onChange(addMinutes(value || "00:00", +15))}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-[1fr,auto] gap-3">
          {/* Hours */}
          <div
            className="rounded-md border bg-background"
            style={{ overscrollBehavior: "contain" }}
          >
            <ScrollArea className="h-[220px]">
              <div ref={hourListRef} className="p-1">
                {hours.map((h) => {
                  const selected = h === hour;
                  return (
                    <button
                      key={h}
                      type="button"
                      data-hour={h}
                      className={cn(
                        "w-full rounded-sm px-2 py-1.5 text-sm text-left transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        selected && "bg-primary text-primary-foreground hover:bg-primary"
                      )}
                      onClick={() => {
                        onChange(formatTime(h, minute));
                      }}
                    >
                      {String(h).padStart(2, "0")}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Minutes */}
          <div className="rounded-md border bg-background p-2">
            <div className="text-xs text-muted-foreground mb-2">Мин</div>
            <div className="grid gap-2">
              {MINUTE_OPTIONS.map((m) => {
                const selected = m === minute;
                return (
                  <button
                    key={m}
                    type="button"
                    className={cn(
                      "rounded-md px-3 py-2 text-sm font-mono transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      selected && "bg-primary text-primary-foreground hover:bg-primary"
                    )}
                    onClick={() => {
                      onChange(formatTime(hour, m));
                      setOpen(false);
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}