import { HeroWelcome } from "./HeroWelcome";
import { TodayScheduleCompact } from "./TodayScheduleCompact";
import { FinanceSummaryWide } from "./FinanceSummaryWide";
import { StudentStatsCompact } from "./StudentStatsCompact";
import { AttendanceCompact } from "./AttendanceCompact";
import { RecentPaymentsWide } from "./RecentPaymentsWide";
import { DebtorsCompact } from "./DebtorsCompact";
import { GroupsCompact } from "./GroupsCompact";
import { LeadsCompact } from "./LeadsCompact";

export function DashboardGrid() {
  return (
    <div className="space-y-4">
      {/* Row 1: Hero + Schedule + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hero Welcome Block - 2 cols */}
        <div className="col-span-1 md:col-span-2 h-[280px]">
          <HeroWelcome />
        </div>

        {/* Today Schedule */}
        <div className="col-span-1 h-[280px]">
          <TodayScheduleCompact />
        </div>

        {/* Right column: Students + Groups stacked */}
        <div className="col-span-1 flex flex-col gap-4">
          <div className="h-[132px]">
            <StudentStatsCompact />
          </div>
          <div className="h-[132px]">
            <GroupsCompact />
          </div>
        </div>
      </div>

      {/* Row 2: Finance + Attendance + Debtors + Leads */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Finance Summary - 2 cols */}
        <div className="col-span-1 md:col-span-2 h-[120px]">
          <FinanceSummaryWide />
        </div>

        {/* Attendance */}
        <div className="col-span-1 h-[120px]">
          <AttendanceCompact />
        </div>

        {/* Debtors */}
        <div className="col-span-1 h-[120px]">
          <DebtorsCompact />
        </div>
      </div>

      {/* Row 3: Leads + Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Leads */}
        <div className="col-span-1 h-[140px]">
          <LeadsCompact />
        </div>

        {/* Recent Payments - 3 cols */}
        <div className="col-span-1 lg:col-span-3">
          <RecentPaymentsWide />
        </div>
      </div>
    </div>
  );
}
