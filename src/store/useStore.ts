import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Teacher, Student, Lesson, Group, Settings } from "@/types";

interface Store {
  teachers: Teacher[];
  students: Student[];
  lessons: Lesson[];
  groups: Group[];
  settings: Settings;
  
  // Teachers
  addTeacher: (teacher: Teacher) => void;
  updateTeacher: (id: string, teacher: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;
  
  // Students
  addStudent: (student: Student) => void;
  updateStudent: (id: string, student: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  
  // Lessons
  addLesson: (lesson: Lesson) => void;
  updateLesson: (id: string, lesson: Partial<Lesson>) => void;
  deleteLesson: (id: string) => void;
  
  // Groups
  addGroup: (group: Group) => void;
  updateGroup: (id: string, group: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  
  // Settings
  updateSettings: (settings: Partial<Settings>) => void;
}

const mockTeachers: Teacher[] = [
  {
    id: "1",
    name: "Иван Петров",
    subject: "Математика",
    email: "ivan@example.com",
    phone: "+7 999 123-45-67",
    status: "active",
    workload: 15,
  },
  {
    id: "2",
    name: "Мария Сидорова",
    subject: "Английский язык",
    email: "maria@example.com",
    phone: "+7 999 234-56-78",
    status: "active",
    workload: 20,
  },
  {
    id: "3",
    name: "Алексей Иванов",
    subject: "Физика",
    email: "alex@example.com",
    phone: "+7 999 345-67-89",
    status: "active",
    workload: 12,
  },
];

const mockStudents: Student[] = [
  {
    id: "1",
    name: "Анна Королева",
    age: 16,
    email: "anna@example.com",
    phone: "+7 999 111-22-33",
    subjects: ["Математика", "Физика"],
    groupIds: ["1", "3"],
  },
  {
    id: "2",
    name: "Дмитрий Волков",
    age: 15,
    email: "dmitry@example.com",
    phone: "+7 999 222-33-44",
    subjects: ["Английский язык"],
    groupIds: ["2"],
  },
  {
    id: "3",
    name: "Елена Смирнова",
    age: 17,
    email: "elena@example.com",
    phone: "+7 999 333-44-55",
    subjects: ["Математика", "Английский язык"],
    groupIds: ["1", "2"],
  },
];

const mockLessons: Lesson[] = [
  {
    id: "1",
    title: "Математика - Алгебра",
    teacherId: "1",
    groupId: "1",
    subject: "Математика",
    start: new Date(2025, 9, 25, 10, 0),
    end: new Date(2025, 9, 25, 11, 30),
    room: "Аудитория 101",
    status: "scheduled",
    studentIds: ["1", "3"],
  },
  {
    id: "2",
    title: "Английский язык - Грамматика",
    teacherId: "2",
    groupId: "2",
    subject: "Английский язык",
    start: new Date(2025, 9, 25, 14, 0),
    end: new Date(2025, 9, 25, 15, 30),
    room: "Аудитория 202",
    status: "scheduled",
    studentIds: ["2", "3"],
  },
  {
    id: "3",
    title: "Физика - Механика",
    teacherId: "3",
    groupId: "3",
    subject: "Физика",
    start: new Date(2025, 9, 26, 11, 0),
    end: new Date(2025, 9, 26, 12, 30),
    room: "Лаборатория 1",
    status: "scheduled",
    studentIds: ["1"],
  },
];

const mockGroups: Group[] = [
  {
    id: "1",
    name: "Математика 10 класс",
    subject: "Математика",
    teacherId: "1",
    studentIds: ["1", "3"],
    schedule: "Пн, Ср, Пт 10:00-11:30",
  },
  {
    id: "2",
    name: "Английский язык A2",
    subject: "Английский язык",
    teacherId: "2",
    studentIds: ["2", "3"],
    schedule: "Вт, Чт 14:00-15:30",
  },
  {
    id: "3",
    name: "Физика 11 класс",
    subject: "Физика",
    teacherId: "3",
    studentIds: ["1"],
    schedule: "Пн, Ср 11:00-12:30",
  },
];

export const useStore = create<Store>()(
  persist(
    (set) => ({
      teachers: mockTeachers,
      students: mockStudents,
      lessons: mockLessons,
      groups: mockGroups,
      settings: {
        centerName: "Образовательный Центр",
        themeColor: "#8B5CF6",
      },

      // Teachers
      addTeacher: (teacher) =>
        set((state) => ({ teachers: [...state.teachers, teacher] })),
      updateTeacher: (id, teacher) =>
        set((state) => ({
          teachers: state.teachers.map((t) =>
            t.id === id ? { ...t, ...teacher } : t
          ),
        })),
      deleteTeacher: (id) =>
        set((state) => ({
          teachers: state.teachers.filter((t) => t.id !== id),
        })),

      // Students
      addStudent: (student) =>
        set((state) => ({ students: [...state.students, student] })),
      updateStudent: (id, student) =>
        set((state) => ({
          students: state.students.map((s) =>
            s.id === id ? { ...s, ...student } : s
          ),
        })),
      deleteStudent: (id) =>
        set((state) => ({
          students: state.students.filter((s) => s.id !== id),
        })),

      // Lessons
      addLesson: (lesson) =>
        set((state) => ({ lessons: [...state.lessons, lesson] })),
      updateLesson: (id, lesson) =>
        set((state) => ({
          lessons: state.lessons.map((l) =>
            l.id === id ? { ...l, ...lesson } : l
          ),
        })),
      deleteLesson: (id) =>
        set((state) => ({
          lessons: state.lessons.filter((l) => l.id !== id),
        })),

      // Groups
      addGroup: (group) =>
        set((state) => ({ groups: [...state.groups, group] })),
      updateGroup: (id, group) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === id ? { ...g, ...group } : g
          ),
        })),
      deleteGroup: (id) =>
        set((state) => ({
          groups: state.groups.filter((g) => g.id !== id),
        })),

      // Settings
      updateSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        })),
    }),
    {
      name: "education-crm-storage",
    }
  )
);
