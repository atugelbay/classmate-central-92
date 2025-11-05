import { useQuery } from "@tanstack/react-query";
import * as subscriptionsApi from "@/api/subscriptions";
import { LessonAttendance } from "@/types";

// Hook to fetch attendances for multiple lessons
export const useLessonAttendances = (lessonIds: string[]) => {
  return useQuery({
    queryKey: ["attendances", "lessons", lessonIds.sort().join(",")],
    queryFn: async () => {
      // Fetch attendance for each lesson
      const attendancesMap = new Map<string, LessonAttendance[]>();
      await Promise.all(
        lessonIds.map(async (lessonId) => {
          try {
            const attendances = await subscriptionsApi.getAttendanceByLesson(lessonId);
            attendancesMap.set(lessonId, attendances);
          } catch (error) {
            // If lesson has no attendance, set empty array
            attendancesMap.set(lessonId, []);
          }
        })
      );
      return attendancesMap;
    },
    enabled: lessonIds.length > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
};
