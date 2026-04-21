import { useQuery } from "@tanstack/react-query";
import * as subscriptionsApi from "@/api/subscriptions";
import { LessonAttendance } from "@/types";

// Hook to fetch attendances for multiple lessons
export const useLessonAttendances = (lessonIds: string[]) => {
  return useQuery({
    queryKey: ["attendances", "lessons", lessonIds.sort().join(",")],
    queryFn: async () => {
      const attendancesMap = new Map<string, LessonAttendance[]>();

      // Avoid exhausting browser/network resources on large schedules.
      const MAX_PARALLEL_REQUESTS = 8;
      for (let i = 0; i < lessonIds.length; i += MAX_PARALLEL_REQUESTS) {
        const chunk = lessonIds.slice(i, i + MAX_PARALLEL_REQUESTS);
        await Promise.all(
          chunk.map(async (lessonId) => {
            try {
              const attendances = await subscriptionsApi.getAttendanceByLesson(lessonId);
              attendancesMap.set(lessonId, attendances);
            } catch (error) {
              // If lesson has no attendance, set empty array
              attendancesMap.set(lessonId, []);
            }
          })
        );
      }

      return attendancesMap;
    },
    enabled: lessonIds.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};
