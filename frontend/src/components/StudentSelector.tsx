import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Student } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Search, UserPlus } from "lucide-react";

interface StudentSelectorProps {
  students: Student[];
  selectedStudentIds: string[];
  onSelectionChange: (studentIds: string[]) => void;
  compact?: boolean;
}

export function StudentSelector({ students, selectedStudentIds, onSelectionChange, compact = false }: StudentSelectorProps) {
  const { t, i18n } = useTranslation(["students", "common"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{t("title")} *</Label>
        <span className="text-[10px] text-muted-foreground">
          {selectedStudents.length} {i18n.language === 'kk' ? 'таңдалды' : i18n.language === 'en' ? 'selected' : 'выбрано'}
        </span>
      </div>

      {/* Combined Input with Chips */}
      <div className="relative">
        <div className={`min-h-[40px] p-2 rounded-lg border bg-background transition-all ${
          isFocused ? 'border-[#8b5cf6] ring-2 ring-[#8b5cf6]/20' : 'border-slate-200 dark:border-slate-700'
        }`}>
          {/* Selected Students as Chips */}
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {selectedStudents.map((student) => (
              <span 
                key={student.id} 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 text-xs font-medium"
              >
                {student.name.split(' ')[0]}
                <button
                  type="button"
                  onClick={() => handleRemoveStudent(student.id)}
                  className="hover:text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={selectedStudents.length > 0 
                ? (i18n.language === 'kk' ? 'Тағы қосу...' : i18n.language === 'en' ? 'Add more...' : 'Добавить ещё...') 
                : (i18n.language === 'kk' ? 'Оқушыны іздеу...' : i18n.language === 'en' ? 'Search student...' : 'Поиск ученика...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 150)}
              className="w-full pl-5 pr-2 py-1 text-sm bg-transparent border-0 outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Dropdown List */}
        {isFocused && searchQuery && availableStudents.length > 0 && (
          <div className="absolute z-50 w-full mt-1 max-h-[160px] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-background shadow-lg">
            {availableStudents.slice(0, 6).map((student) => (
              <button
                key={student.id}
                type="button"
                onMouseDown={() => handleAddStudent(student.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] to-[#a855f7] text-[10px] font-semibold text-white">
                  {student.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{student.name}</p>
                </div>
                <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ))}
            {availableStudents.length > 6 && (
              <p className="text-[10px] text-muted-foreground text-center py-1.5 border-t">
                +{availableStudents.length - 6} {i18n.language === 'kk' ? 'тағы' : i18n.language === 'en' ? 'more' : 'ещё'}
              </p>
            )}
          </div>
        )}

        {isFocused && searchQuery && availableStudents.length === 0 && (
          <div className="absolute z-50 w-full mt-1 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background shadow-lg">
            <p className="text-xs text-muted-foreground text-center">
              {i18n.language === 'kk' ? 'Табылмады' : i18n.language === 'en' ? 'Not found' : 'Не найдено'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

