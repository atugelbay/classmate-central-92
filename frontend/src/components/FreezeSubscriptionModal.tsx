import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StudentSubscription } from "@/types";
import moment from "moment";
import "moment/locale/ru";

moment.locale("ru");

interface FreezeSubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  subscription: StudentSubscription;
  onFreeze: (freezeStart: string, freezeEnd: string, reason: string) => Promise<void>;
  isLoading?: boolean;
}

export default function FreezeSubscriptionModal({
  open,
  onClose,
  subscription,
  onFreeze,
  isLoading = false,
}: FreezeSubscriptionModalProps) {
  const [freezeStart, setFreezeStart] = useState("");
  const [freezeEnd, setFreezeEnd] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!freezeStart || !freezeEnd) return;

    try {
      await onFreeze(freezeStart, freezeEnd, reason);
      setFreezeStart("");
      setFreezeEnd("");
      setReason("");
      onClose();
    } catch (error) {
      // Error handled by parent
    }
  };

  const startDate = moment(subscription.startDate);
  const endDate = subscription.endDate ? moment(subscription.endDate) : null;
  const minDate = startDate.format("YYYY-MM-DD");
  const maxDate = endDate ? endDate.format("YYYY-MM-DD") : undefined;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Заморозить абонемент</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Info Section */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Абонемент</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{subscription.subscriptionTypeName || "Индивидуальный"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Период</span>
              <span className="text-slate-700 dark:text-slate-300">
                {startDate.format("DD.MM.YYYY")} - {endDate ? endDate.format("DD.MM.YYYY") : "∞"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Осталось</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{subscription.lessonsRemaining} уроков</span>
            </div>
          </div>

          {/* Section: Период заморозки */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Период заморозки</h4>
            
            {/* Start & End Date - Two columns */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="freezeStart">Начало *</Label>
                <Input
                  id="freezeStart"
                  type="date"
                  value={freezeStart}
                  onChange={(e) => setFreezeStart(e.target.value)}
                  min={minDate}
                  max={maxDate}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="freezeEnd">Окончание *</Label>
                <Input
                  id="freezeEnd"
                  type="date"
                  value={freezeEnd}
                  onChange={(e) => setFreezeEnd(e.target.value)}
                  min={freezeStart || minDate}
                  max={maxDate}
                  required
                />
              </div>
            </div>
            {freezeStart && freezeEnd && (
              <p className="text-xs text-muted-foreground">
                Длительность: {moment(freezeEnd).diff(moment(freezeStart), "days") + 1} дней
              </p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="reason">Причина (опционально)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Укажите причину заморозки..."
              rows={2}
            />
          </div>

          {/* Info Note */}
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">Важно:</p>
            <p>Абонемент будет автоматически продлен на количество дней заморозки.</p>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button 
              type="submit" 
              disabled={isLoading || !freezeStart || !freezeEnd}
              className="w-full bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#a855f7] hover:opacity-90 text-white shadow-md"
            >
              {isLoading ? "Обработка..." : "Заморозить абонемент"}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} className="w-full text-muted-foreground">
              Отмена
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
