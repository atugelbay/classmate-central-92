import { useState } from "react";
import { Student } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Search, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StudentSelectorProps {
  students: Student[];
  selectedStudentIds: string[];
  onSelectionChange: (studentIds: string[]) => void;
}

export function StudentSelector({ students, selectedStudentIds, onSelectionChange }: StudentSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const availableStudents = students.filter(
    (s) => !selectedStudentIds.includes(s.id) && s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedStudents = students.filter((s) => selectedStudentIds.includes(s.id));

  const handleAddStudent = (studentId: string) => {
    onSelectionChange([...selectedStudentIds, studentId]);
    setSearchQuery("");
  };

  const handleRemoveStudent = (studentId: string) => {
    onSelectionChange(selectedStudentIds.filter((id) => id !== studentId));
  };

  return (
    <div className="space-y-3">
      <Label>Ученики</Label>

      {/* Selected Students */}
      {selectedStudents.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          {selectedStudents.map((student) => (
            <Badge key={student.id} variant="secondary" className="flex items-center gap-1 py-1 px-2">
              <User className="h-3 w-3" />
              {student.name}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => handleRemoveStudent(student.id)}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Search for Students */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск ученика..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Available Students List */}
        {searchQuery && availableStudents.length > 0 && (
          <ScrollArea className="h-[200px] rounded-md border p-2">
            <div className="space-y-1">
              {availableStudents.slice(0, 10).map((student) => (
                <div
                  key={student.id}
                  onClick={() => handleAddStudent(student.id)}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {student.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{student.name}</p>
                    <p className="text-xs text-muted-foreground">{student.email}</p>
                  </div>
                </div>
              ))}
              {availableStudents.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Показано 10 из {availableStudents.length} результатов
                </p>
              )}
            </div>
          </ScrollArea>
        )}

        {searchQuery && availableStudents.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Ученики не найдены</p>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Выбрано учеников: {selectedStudents.length}
      </p>
    </div>
  );
}

