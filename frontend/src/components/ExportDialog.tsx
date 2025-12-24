import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import moment from "moment";
import { ScheduleExportFilters, StudentsExportFilters, TransactionsExportFilters } from "@/api/export";
import { exportAPI, downloadBlob } from "@/api/export";
import { toast } from "sonner";

moment.locale("ru");

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "schedule" | "students" | "transactions";
  // For schedule
  teachers?: Array<{ id: string; name: string }>;
  groups?: Array<{ id: string; name: string }>;
  rooms?: Array<{ id: string; name: string }>;
  // For students
  students?: Array<{ id: string; name: string }>;
  // For transactions
  defaultStartDate?: string;
  defaultEndDate?: string;
  // Single student mode (for student detail page)
  singleStudentMode?: boolean;
  singleStudentId?: string;
  singleStudentName?: string;
}

export function ExportDialog({
  open,
  onOpenChange,
  type,
  teachers = [],
  groups = [],
  rooms = [],
  students = [],
  defaultStartDate,
  defaultEndDate,
  singleStudentMode = false,
  singleStudentId,
  singleStudentName,
}: ExportDialogProps) {
  const [format, setFormat] = useState<"pdf" | "excel">("pdf");
  const [loading, setLoading] = useState(false);

  // Schedule filters
  const [scheduleStartDate, setScheduleStartDate] = useState(
    defaultStartDate || moment().subtract(30, "days").format("YYYY-MM-DD")
  );
  const [scheduleEndDate, setScheduleEndDate] = useState(
    defaultEndDate || moment().add(30, "days").format("YYYY-MM-DD")
  );
  const [scheduleTeacherId, setScheduleTeacherId] = useState<string>("all");
  const [scheduleGroupId, setScheduleGroupId] = useState<string>("all");
  const [scheduleRoomId, setScheduleRoomId] = useState<string>("all");
  const [scheduleStatus, setScheduleStatus] = useState<string>("all");

  // Students filters
  const [studentStatus, setStudentStatus] = useState<string>("all");
  const [studentGroupId, setStudentGroupId] = useState<string>("all");
  const [studentTeacherId, setStudentTeacherId] = useState<string>("all");
  const [studentHasBalance, setStudentHasBalance] = useState<boolean | undefined>(undefined);
  const [studentQuery, setStudentQuery] = useState<string>("");

  // Transactions filters
  const [transactionStartDate, setTransactionStartDate] = useState(
    defaultStartDate || moment().subtract(30, "days").format("YYYY-MM-DD")
  );
  const [transactionEndDate, setTransactionEndDate] = useState(
    defaultEndDate || moment().format("YYYY-MM-DD")
  );
  const [transactionType, setTransactionType] = useState<string>("all");
  const [transactionStudentId, setTransactionStudentId] = useState<string>("all");
  const [transactionTeacherId, setTransactionTeacherId] = useState<string>("all");
  const [transactionGroupId, setTransactionGroupId] = useState<string>("all");

  const handleExport = async () => {
    setLoading(true);
    try {
      let blob: Blob;
      let filename: string;

      if (type === "schedule") {
        const filters: ScheduleExportFilters = {
          startDate: scheduleStartDate || undefined,
          endDate: scheduleEndDate || undefined,
          teacherId: scheduleTeacherId && scheduleTeacherId !== "all" ? scheduleTeacherId : undefined,
          groupId: scheduleGroupId && scheduleGroupId !== "all" ? scheduleGroupId : undefined,
          roomId: scheduleRoomId && scheduleRoomId !== "all" ? scheduleRoomId : undefined,
          status: scheduleStatus && scheduleStatus !== "all" ? scheduleStatus : undefined,
          studentId: singleStudentMode && singleStudentId ? singleStudentId : undefined,
        };

        if (format === "pdf") {
          blob = await exportAPI.exportSchedulePDF(filters);
          filename = `schedule_${moment().format("YYYY-MM-DD")}.pdf`;
        } else {
          blob = await exportAPI.exportScheduleExcel(filters);
          filename = `schedule_${moment().format("YYYY-MM-DD")}.xlsx`;
        }
      } else if (type === "students") {
        const filters: StudentsExportFilters = {
          status: studentStatus && studentStatus !== "all" ? studentStatus : undefined,
          groupId: studentGroupId && studentGroupId !== "all" ? studentGroupId : undefined,
          teacherId: studentTeacherId && studentTeacherId !== "all" ? studentTeacherId : undefined,
          hasBalance: studentHasBalance,
          query: studentQuery || undefined,
        };

        if (format === "pdf") {
          blob = await exportAPI.exportStudentsPDF(filters);
          filename = `students_${moment().format("YYYY-MM-DD")}.pdf`;
        } else {
          blob = await exportAPI.exportStudentsExcel(filters);
          filename = `students_${moment().format("YYYY-MM-DD")}.xlsx`;
        }
      } else {
        // transactions
        const filters: TransactionsExportFilters = {
          startDate: transactionStartDate || undefined,
          endDate: transactionEndDate || undefined,
          type: transactionType && transactionType !== "all" ? transactionType : undefined,
          studentId: singleStudentMode && singleStudentId 
            ? singleStudentId 
            : (transactionStudentId && transactionStudentId !== "all" ? transactionStudentId : undefined),
          teacherId: transactionTeacherId && transactionTeacherId !== "all" ? transactionTeacherId : undefined,
          groupId: transactionGroupId && transactionGroupId !== "all" ? transactionGroupId : undefined,
        };

        if (format === "pdf") {
          blob = await exportAPI.exportTransactionsPDF(filters);
          filename = `transactions_${moment().format("YYYY-MM-DD")}.pdf`;
        } else {
          blob = await exportAPI.exportTransactionsExcel(filters);
          filename = `transactions_${moment().format("YYYY-MM-DD")}.xlsx`;
        }
      }

      downloadBlob(blob, filename);
      toast.success(`${format.toUpperCase()} экспортирован`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Ошибка при экспорте ${format.toUpperCase()}: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Экспорт данных</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Format selection */}
          <div className="space-y-2">
            <Label>Формат экспорта</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={format === "pdf" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setFormat("pdf")}
              >
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </Button>
              <Button
                type="button"
                variant={format === "excel" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setFormat("excel")}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel
              </Button>
            </div>
          </div>

          {/* Schedule filters */}
          {type === "schedule" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schedule-start-date">Начало периода</Label>
                  <Input
                    id="schedule-start-date"
                    type="date"
                    value={scheduleStartDate}
                    onChange={(e) => setScheduleStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schedule-end-date">Конец периода</Label>
                  <Input
                    id="schedule-end-date"
                    type="date"
                    value={scheduleEndDate}
                    onChange={(e) => setScheduleEndDate(e.target.value)}
                  />
                </div>
              </div>

              {singleStudentMode && singleStudentName && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900">
                    <span className="font-medium">Студент:</span> {singleStudentName}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Будут включены все занятия студента за выбранный период (посещенные, пропущенные, запланированные)
                  </p>
                </div>
              )}

              {!singleStudentMode && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="schedule-teacher">Учитель</Label>
                    <Select value={scheduleTeacherId} onValueChange={setScheduleTeacherId}>
                      <SelectTrigger id="schedule-teacher">
                        <SelectValue placeholder="Все учителя" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все учителя</SelectItem>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schedule-group">Группа</Label>
                    <Select value={scheduleGroupId} onValueChange={setScheduleGroupId}>
                      <SelectTrigger id="schedule-group">
                        <SelectValue placeholder="Все группы" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все группы</SelectItem>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schedule-room">Аудитория</Label>
                    <Select value={scheduleRoomId} onValueChange={setScheduleRoomId}>
                      <SelectTrigger id="schedule-room">
                        <SelectValue placeholder="Все аудитории" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все аудитории</SelectItem>
                        {rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schedule-status">Статус урока</Label>
                    <Select value={scheduleStatus} onValueChange={setScheduleStatus}>
                      <SelectTrigger id="schedule-status">
                        <SelectValue placeholder="Все статусы" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все статусы</SelectItem>
                        <SelectItem value="scheduled">Запланирован</SelectItem>
                        <SelectItem value="cancelled">Отменен</SelectItem>
                        <SelectItem value="completed">Завершен</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </>
          )}

          {/* Students filters */}
          {type === "students" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="student-status">Статус</Label>
                <Select value={studentStatus} onValueChange={setStudentStatus}>
                  <SelectTrigger id="student-status">
                    <SelectValue placeholder="Все статусы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="active">Активный</SelectItem>
                    <SelectItem value="inactive">Неактивный</SelectItem>
                    <SelectItem value="frozen">Заморожен</SelectItem>
                    <SelectItem value="graduated">Закончил</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="student-group">Группа</Label>
                <Select value={studentGroupId} onValueChange={setStudentGroupId}>
                  <SelectTrigger id="student-group">
                    <SelectValue placeholder="Все группы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все группы</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="student-teacher">Учитель</Label>
                <Select value={studentTeacherId} onValueChange={setStudentTeacherId}>
                  <SelectTrigger id="student-teacher">
                    <SelectValue placeholder="Все учителя" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все учителя</SelectItem>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="student-query">Поиск</Label>
                <Input
                  id="student-query"
                  placeholder="Поиск по имени, email, телефону..."
                  value={studentQuery}
                  onChange={(e) => setStudentQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="student-has-balance"
                  checked={studentHasBalance === true}
                  onCheckedChange={(checked) =>
                    setStudentHasBalance(checked === true ? true : checked === false ? false : undefined)
                  }
                />
                <Label htmlFor="student-has-balance" className="cursor-pointer">
                  Только с балансом
                </Label>
              </div>
            </>
          )}

          {/* Transactions filters */}
          {type === "transactions" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transaction-start-date">Начало периода</Label>
                  <Input
                    id="transaction-start-date"
                    type="date"
                    value={transactionStartDate}
                    onChange={(e) => setTransactionStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transaction-end-date">Конец периода</Label>
                  <Input
                    id="transaction-end-date"
                    type="date"
                    value={transactionEndDate}
                    onChange={(e) => setTransactionEndDate(e.target.value)}
                  />
                </div>
              </div>

              {singleStudentMode && singleStudentName && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900">
                    <span className="font-medium">Студент:</span> {singleStudentName}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Будут включены все платежи и списания студента за выбранный период
                  </p>
                </div>
              )}

              {!singleStudentMode && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="transaction-type">Тип операции</Label>
                    <Select value={transactionType} onValueChange={setTransactionType}>
                      <SelectTrigger id="transaction-type">
                        <SelectValue placeholder="Все типы" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все типы</SelectItem>
                        <SelectItem value="payment">Платеж</SelectItem>
                        <SelectItem value="writeoff">Списание</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transaction-student">Ученик</Label>
                    <Select value={transactionStudentId} onValueChange={setTransactionStudentId}>
                      <SelectTrigger id="transaction-student">
                        <SelectValue placeholder="Все ученики" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все ученики</SelectItem>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transaction-teacher">Учитель</Label>
                    <Select value={transactionTeacherId} onValueChange={setTransactionTeacherId}>
                      <SelectTrigger id="transaction-teacher">
                        <SelectValue placeholder="Все учителя" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все учителя</SelectItem>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transaction-group">Группа</Label>
                    <Select value={transactionGroupId} onValueChange={setTransactionGroupId}>
                      <SelectTrigger id="transaction-group">
                        <SelectValue placeholder="Все группы" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все группы</SelectItem>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleExport} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Экспорт...
              </>
            ) : (
              <>
                {format === "pdf" ? (
                  <FileText className="mr-2 h-4 w-4" />
                ) : (
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                )}
                Экспортировать {format.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

