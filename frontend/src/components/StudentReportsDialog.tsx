import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet, Calendar, DollarSign, BookOpen } from "lucide-react";
import { ExportDialog } from "@/components/ExportDialog";
import { Student } from "@/types";
import moment from "moment";

interface StudentReportsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  groups?: Array<{ id: string; name: string }>;
  teachers?: Array<{ id: string; name: string }>;
}

type ReportType = "transactions" | "schedule" | null;

export function StudentReportsDialog({
  open,
  onOpenChange,
  student,
  groups = [],
  teachers = [],
}: StudentReportsDialogProps) {
  const [selectedReport, setSelectedReport] = useState<ReportType>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const handleReportSelect = (type: ReportType) => {
    setSelectedReport(type);
    setExportDialogOpen(true);
    onOpenChange(false);
  };

  const handleExportDialogClose = () => {
    setExportDialogOpen(false);
    setSelectedReport(null);
  };

  if (!student) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Выберите тип отчета</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <Button
              variant="outline"
              className="h-auto flex-col items-start p-4 hover:bg-accent"
              onClick={() => handleReportSelect("transactions")}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-green-100">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold">Финансовый отчет</h3>
                  <p className="text-sm text-muted-foreground">
                    Платежи, списания и баланс студента
                  </p>
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col items-start p-4 hover:bg-accent"
              onClick={() => handleReportSelect("schedule")}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold">Отчет по расписанию</h3>
                  <p className="text-sm text-muted-foreground">
                    Занятия и посещаемость студента
                  </p>
                </div>
              </div>
            </Button>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Студент: <span className="font-medium">{student.name}</span>
            </p>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      {selectedReport === "transactions" && (
        <ExportDialog
          open={exportDialogOpen}
          onOpenChange={handleExportDialogClose}
          type="transactions"
          defaultStartDate={moment().subtract(90, "days").format("YYYY-MM-DD")}
          defaultEndDate={moment().format("YYYY-MM-DD")}
          singleStudentMode={true}
          singleStudentId={student.id}
          singleStudentName={student.name}
        />
      )}

      {selectedReport === "schedule" && (
        <ExportDialog
          open={exportDialogOpen}
          onOpenChange={handleExportDialogClose}
          type="schedule"
          defaultStartDate={moment().subtract(30, "days").format("YYYY-MM-DD")}
          defaultEndDate={moment().add(30, "days").format("YYYY-MM-DD")}
          singleStudentMode={true}
          singleStudentId={student.id}
          singleStudentName={student.name}
        />
      )}
    </>
  );
}

