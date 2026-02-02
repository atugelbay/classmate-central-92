import { UserPlus, ArrowRight, Loader2, Phone, Clock } from "lucide-react";
import { useLeads } from "@/hooks/useData";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import moment from "moment";
import "moment/locale/ru";
import "moment/locale/kk";

export function LeadsCompact() {
  const navigate = useNavigate();
  const { data: leads = [], isLoading } = useLeads();
  const { t, i18n } = useTranslation("dashboard");

  // Set moment locale based on current language
  moment.locale(i18n.language);

  const newLeads = Array.isArray(leads) 
    ? leads
        .filter((l: any) => l.status === "new")
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
    : [];

  const totalNew = Array.isArray(leads) ? leads.filter((l: any) => l.status === "new").length : 0;
  const totalInProgress = Array.isArray(leads) ? leads.filter((l: any) => l.status === "in_progress").length : 0;

  // No leads text translations
  const getNoLeadsText = () => {
    const texts = { ru: "Нет новых заявок", kk: "Жаңа өтініштер жоқ", en: "No new leads" };
    return texts[i18n.language as 'ru' | 'kk' | 'en'] || texts.ru;
  };

  return (
    <div 
      className="h-full rounded-2xl bg-card border border-border p-4 flex flex-col cursor-pointer transition-all hover:shadow-lg hover:border-cyan-200 dark:hover:border-cyan-800"
      onClick={() => navigate("/leads")}
    >
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-foreground">{t("leads.title")}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {t("common:all")} <ArrowRight className="h-3 w-3" />
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 p-3 rounded-xl bg-cyan-500/10">
              <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{totalNew}</div>
              <div className="text-xs text-muted-foreground">{t("leads.new").toLowerCase()}</div>
            </div>
            <div className="flex-1 p-3 rounded-xl bg-amber-500/10">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{totalInProgress}</div>
              <div className="text-xs text-muted-foreground">{t("leads.inProgress").toLowerCase()}</div>
            </div>
          </div>

          {/* Recent leads list */}
          <div className="flex-1 overflow-y-auto">
            {newLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-4 text-muted-foreground">
                <UserPlus className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">{getNoLeadsText()}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {newLeads.map((lead: any) => (
                  <div
                    key={lead.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="p-1.5 rounded-lg bg-cyan-500/10">
                      <Phone className="h-3.5 w-3.5 text-cyan-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground text-sm truncate">
                        {lead.name}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {moment(lead.createdAt).fromNow()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
