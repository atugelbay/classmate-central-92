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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Заморозить абонемент</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="text-sm">
              <span className="font-medium">Абонемент:</span> {subscription.subscriptionTypeName || "Индивидуальный"}
            </div>
            <div className="text-sm">
              <span className="font-medium">Период действия:</span>{" "}
              {startDate.format("DD.MM.YYYY")} - {endDate ? endDate.format("DD.MM.YYYY") : "без ограничений"}
            </div>
            <div className="text-sm">
              <span className="font-medium">Осталось уроков:</span> {subscription.lessonsRemaining}
            </div>
          </div>

          <div>
            <Label htmlFor="freezeStart">Дата начала заморозки</Label>
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

          <div>
            <Label htmlFor="freezeEnd">Дата окончания заморозки</Label>
            <Input
              id="freezeEnd"
              type="date"
              value={freezeEnd}
              onChange={(e) => setFreezeEnd(e.target.value)}
              min={freezeStart || minDate}
              max={maxDate}
              required
            />
            {freezeStart && freezeEnd && (
              <p className="text-xs text-muted-foreground mt-1">
                Длительность: {moment(freezeEnd).diff(moment(freezeStart), "days") + 1} дней
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="reason">Причина заморозки (опционально)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Укажите причину заморозки..."
              rows={3}
            />
          </div>

          <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
            <p className="font-medium mb-1">Важно:</p>
            <p>
              Все уроки в период заморозки будут перенесены на период после окончания заморозки.
              Абонемент будет автоматически продлен на количество дней заморозки.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading || !freezeStart || !freezeEnd}>
              {isLoading ? "Обработка..." : "Заморозить абонемент"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
