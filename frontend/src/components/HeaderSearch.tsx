import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Student } from "@/types";
import { studentsAPI } from "@/api/students";
import { useQuery } from "@tanstack/react-query";

export function HeaderSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch all students (or use search if backend supports it)
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ["students", "all"],
    queryFn: async () => {
      const result = await studentsAPI.getAll();
      // Handle both array and paginated response
      if (Array.isArray(result)) {
        return result;
      }
      if (result && typeof result === 'object' && 'items' in result) {
        return (result as { items: Student[] }).items;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const allStudents: Student[] = Array.isArray(studentsData) ? studentsData : [];

  // Filter students on client side
  const filteredStudents = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < 1) return [];
    
    const query = debouncedQuery.toLowerCase().trim();
    if (!query) return [];
    
    return allStudents.filter((student: Student) => {
      const nameMatch = student.name?.toLowerCase().includes(query) || false;
      const emailMatch = student.email?.toLowerCase().includes(query) || false;
      const phoneMatch = student.phone?.replace(/\s/g, "").includes(query.replace(/\s/g, "")) || false;
      
      return nameMatch || emailMatch || phoneMatch;
    }).slice(0, 10);
  }, [allStudents, debouncedQuery]);

  const handleSelect = (student: Student) => {
    navigate(`/students/${student.id}`);
    setOpen(false);
    setSearchQuery("");
    setDebouncedQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Поиск учеников..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.length > 0) {
                setOpen(true);
              } else {
                setOpen(false);
              }
            }}
            onFocus={(e) => {
              e.stopPropagation();
              if (searchQuery.length > 0 && filteredStudents.length > 0) {
                setOpen(true);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="pl-10 pr-4"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[--radix-popover-trigger-width] p-0" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false}>
          <CommandList>
            {isLoading && searchQuery.length > 0 ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : filteredStudents.length === 0 && debouncedQuery.length > 0 ? (
              <CommandEmpty>Ученики не найдены</CommandEmpty>
            ) : filteredStudents.length > 0 ? (
              <CommandGroup heading="Ученики">
                {filteredStudents.map((student) => (
                  <CommandItem
                    key={student.id}
                    value={student.id}
                    onSelect={() => handleSelect(student)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold">
                        {student.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{student.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {student.email || ""} {student.email && student.phone ? "•" : ""} {student.phone || ""}
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : (
              <CommandEmpty>Начните вводить для поиска...</CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
