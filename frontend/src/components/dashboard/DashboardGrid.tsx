import { HeroWelcome } from "./HeroWelcome";
import { QuickActionsRow } from "./QuickActionsRow";
import { TodayScheduleCompact } from "./TodayScheduleCompact";
import { FinanceSummaryWide } from "./FinanceSummaryWide";
import { StudentStatsCompact } from "./StudentStatsCompact";
import { AttendanceCompact } from "./AttendanceCompact";
import { RecentPaymentsList } from "./RecentPaymentsList";
import { DebtorsCompact } from "./DebtorsCompact";
import { GroupsCompact } from "./GroupsCompact";
import { LeadsCompact } from "./LeadsCompact";

export function DashboardGrid() {
  return (
    <div className="space-y-4">
      {/* Row 1: Compact Hero Banner */}
      <HeroWelcome />

      {/* Row 2: Quick Actions */}
      <QuickActionsRow />

      {/* Row 3: Main Analytics + Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Large Analytics Cards - 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          {/* Finance Summary - Large Card */}
          <FinanceSummaryWide />

          {/* Students & Groups Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="h-[160px]">
              <StudentStatsCompact />
            </div>
            <div className="h-[160px]">
              <GroupsCompact />
            </div>
          </div>

          {/* Attendance & Debtors Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="h-[120px]">
              <AttendanceCompact />
            </div>
            <div className="h-[120px]">
              <DebtorsCompact />
            </div>
          </div>
        </div>

        {/* Right: Narrow Payments List - 1 col */}
        <div className="lg:col-span-1">
          <RecentPaymentsList />
        </div>
      </div>

      {/* Row 4: Schedule + Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-[280px]">
          <TodayScheduleCompact />
        </div>
        <div className="h-[280px]">
          <LeadsCompact />
        </div>
      </div>
    </div>
  );
}
