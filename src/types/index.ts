export interface Teacher {
  id: string;
  name: string;
  subject: string;
  email: string;
  phone: string;
  status: "active" | "inactive";
  avatar?: string;
  workload: number; // lessons per week
}

export interface Student {
  id: string;
  name: string;
  age: number;
  email: string;
  phone: string;
  subjects: string[];
  groupIds: string[];
  avatar?: string;
}

export interface Lesson {
  id: string;
  title: string;
  teacherId: string;
  groupId?: string;
  subject: string;
  start: Date;
  end: Date;
  room: string;
  status: "scheduled" | "completed" | "cancelled";
  studentIds: string[];
}

export interface Group {
  id: string;
  name: string;
  subject: string;
  teacherId: string;
  studentIds: string[];
  schedule: string;
}

export interface Settings {
  centerName: string;
  logo?: string;
  themeColor: string;
}
