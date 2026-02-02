import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import moment from "moment";
import "moment/locale/kk";
import { ScheduleExportFilters, StudentsExportFilters, TransactionsExportFilters } from "@/api/export";
import { exportAPI, downloadBlob } from "@/api/export";
import { toast } from "sonner";

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
  const { t, i18n } = useTranslation("common");
  moment.locale(i18n.language);
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
      toast.success(t("exportDialog.exported", { format: format.toUpperCase() }));
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`${t("exportDialog.exportError", { format: format.toUpperCase() })}: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("exportDialog.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Format selection */}
          <div className="space-y-3">
            <Label>{t("exportDialog.format")}</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat("pdf")}
                className={`p-4 rounded-2xl transition-all flex flex-col items-center gap-2 ${
                  format === "pdf"
                    ? "bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg"
                    : "bg-muted/50 hover:bg-muted"
                }`}
              >
                <FileText className="h-6 w-6" />
                <span className="font-medium">PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat("excel")}
                className={`p-4 rounded-2xl transition-all flex flex-col items-center gap-2 ${
                  format === "excel"
                    ? "bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg"
                    : "bg-muted/50 hover:bg-muted"
                }`}
              >
                <FileSpreadsheet className="h-6 w-6" />
                <span className="font-medium">Excel</span>
              </button>
            </div>
          </div>

          {/* Schedule filters */}
          {type === "schedule" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schedule-start-date">{t("exportDialog.periodStart")}</Label>
                  <Input
                    id="schedule-start-date"
                    type="date"
                    value={scheduleStartDate}
                    onChange={(e) => setScheduleStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schedule-end-date">{t("exportDialog.periodEnd")}</Label>
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
                    <span className="font-medium">{t("exportDialog.student")}:</span> {singleStudentName}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {t("exportDialog.studentInfo")}
                  </p>
                </div>
              )}

              {!singleStudentMode && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="schedule-teacher">{t("exportDialog.teacher")}</Label>
                    <Select value={scheduleTeacherId} onValueChange={setScheduleTeacherId}>
                      <SelectTrigger id="schedule-teacher">
                        <SelectValue placeholder={t("exportDialog.allTeachers")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("exportDialog.allTeachers")}</SelectItem>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schedule-group">{t("exportDialog.group")}</Label>
                    <Select value={scheduleGroupId} onValueChange={setScheduleGroupId}>
                      <SelectTrigger id="schedule-group">
                        <SelectValue placeholder={t("exportDialog.allGroups")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("exportDialog.allGroups")}</SelectItem>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schedule-room">{t("exportDialog.room")}</Label>
                    <Select value={scheduleRoomId} onValueChange={setScheduleRoomId}>
                      <SelectTrigger id="schedule-room">
                        <SelectValue placeholder={t("exportDialog.allRooms")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("exportDialog.allRooms")}</SelectItem>
                        {rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schedule-status">{t("exportDialog.lessonStatus")}</Label>
                    <Select value={scheduleStatus} onValueChange={setScheduleStatus}>
                      <SelectTrigger id="schedule-status">
                        <SelectValue placeholder={t("exportDialog.allStatuses")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("exportDialog.allStatuses")}</SelectItem>
                        <SelectItem value="scheduled">{t("exportDialog.statusScheduled")}</SelectItem>
                        <SelectItem value="cancelled">{t("exportDialog.statusCancelled")}</SelectItem>
                        <SelectItem value="completed">{t("exportDialog.statusCompleted")}</SelectItem>
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
                <Label htmlFor="student-status">{t("exportDialog.status")}</Label>
                <Select value={studentStatus} onValueChange={setStudentStatus}>
                  <SelectTrigger id="student-status">
                    <SelectValue placeholder={t("exportDialog.allStatuses")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("exportDialog.allStatuses")}</SelectItem>
                    <SelectItem value="active">{t("exportDialog.statusActive")}</SelectItem>
                    <SelectItem value="inactive">{t("exportDialog.statusInactive")}</SelectItem>
                    <SelectItem value="frozen">{t("exportDialog.statusFrozen")}</SelectItem>
                    <SelectItem value="graduated">{t("exportDialog.statusGraduated")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="student-group">{t("exportDialog.group")}</Label>
                <Select value={studentGroupId} onValueChange={setStudentGroupId}>
                  <SelectTrigger id="student-group">
                    <SelectValue placeholder={t("exportDialog.allGroups")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("exportDialog.allGroups")}</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="student-teacher">{t("exportDialog.teacher")}</Label>
                <Select value={studentTeacherId} onValueChange={setStudentTeacherId}>
                  <SelectTrigger id="student-teacher">
                    <SelectValue placeholder={t("exportDialog.allTeachers")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("exportDialog.allTeachers")}</SelectItem>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="student-query">{t("exportDialog.search")}</Label>
                <Input
                  id="student-query"
                  placeholder={t("exportDialog.searchPlaceholder")}
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
                  {t("exportDialog.hasBalanceOnly")}
                </Label>
              </div>
            </>
          )}

          {/* Transactions filters */}
          {type === "transactions" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transaction-start-date">{t("exportDialog.periodStart")}</Label>
                  <Input
                    id="transaction-start-date"
                    type="date"
                    value={transactionStartDate}
                    onChange={(e) => setTransactionStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transaction-end-date">{t("exportDialog.periodEnd")}</Label>
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
                    <span className="font-medium">{t("exportDialog.student")}:</span> {singleStudentName}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {t("exportDialog.studentTransactionsInfo")}
                  </p>
                </div>
              )}

              {!singleStudentMode && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="transaction-type">{t("exportDialog.operationType")}</Label>
                    <Select value={transactionType} onValueChange={setTransactionType}>
                      <SelectTrigger id="transaction-type">
                        <SelectValue placeholder={t("exportDialog.allTypes")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("exportDialog.allTypes")}</SelectItem>
                        <SelectItem value="payment">{t("exportDialog.typePayment")}</SelectItem>
                        <SelectItem value="writeoff">{t("exportDialog.typeWriteoff")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transaction-student">{t("exportDialog.studentFilter")}</Label>
                    <Select value={transactionStudentId} onValueChange={setTransactionStudentId}>
                      <SelectTrigger id="transaction-student">
                        <SelectValue placeholder={t("exportDialog.allStudents")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("exportDialog.allStudents")}</SelectItem>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transaction-teacher">{t("exportDialog.teacher")}</Label>
                    <Select value={transactionTeacherId} onValueChange={setTransactionTeacherId}>
                      <SelectTrigger id="transaction-teacher">
                        <SelectValue placeholder={t("exportDialog.allTeachers")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("exportDialog.allTeachers")}</SelectItem>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transaction-group">{t("exportDialog.group")}</Label>
                    <Select value={transactionGroupId} onValueChange={setTransactionGroupId}>
                      <SelectTrigger id="transaction-group">
                        <SelectValue placeholder={t("exportDialog.allGroups")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("exportDialog.allGroups")}</SelectItem>
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

        <DialogFooter className="border-t border-border/50 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="rounded-xl">
            {t("cancel")}
          </Button>
          <Button onClick={handleExport} disabled={loading} className="rounded-xl">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("exportDialog.exporting")}
              </>
            ) : (
              <>
                {format === "pdf" ? (
                  <FileText className="mr-2 h-4 w-4" />
                ) : (
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                )}
                {t("exportDialog.exportFormat", { format: format.toUpperCase() })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

