import { useAuth } from "@/context/AuthContext";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import moment from "moment";
import "moment/locale/ru";
import "moment/locale/kk";

export function HeroWelcome() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation("dashboard");
  moment.locale(i18n.language);
  
  // Get formatted date using moment.js for proper localization
  const formattedDate = moment().format("dddd, D MMMM");

  // Get greeting based on time of day
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    const greetings = {
      ru: {
        morning: "Доброе утро",
        afternoon: "Добрый день",
        evening: "Добрый вечер",
        night: "Доброй ночи"
      },
      kk: {
        morning: "Қайырлы таң",
        afternoon: "Қайырлы күн",
        evening: "Қайырлы кеш",
        night: "Қайырлы түн"
      },
      en: {
        morning: "Good morning",
        afternoon: "Good afternoon",
        evening: "Good evening",
        night: "Good night"
      }
    };
    
    const lang = (i18n.language as 'ru' | 'kk' | 'en') || 'ru';
    const texts = greetings[lang] || greetings.ru;
    
    if (hour >= 6 && hour < 12) return texts.morning;
    if (hour >= 12 && hour < 18) return texts.afternoon;
    if (hour >= 18 && hour < 23) return texts.evening;
    return texts.night;
  };

  // Motivational text translations
  const getMotivationalText = (): string => {
    const texts = {
      ru: "Отличного продуктивного дня!",
      kk: "Өнімді күн болсын!",
      en: "Have a productive day!"
    };
    const lang = (i18n.language as 'ru' | 'kk' | 'en') || 'ru';
    return texts[lang] || texts.ru;
  };

  // Guest text translations
  const getGuestText = (): string => {
    const texts = { ru: "Гость", kk: "Қонақ", en: "Guest" };
    const lang = (i18n.language as 'ru' | 'kk' | 'en') || 'ru';
    return texts[lang] || texts.ru;
  };

  return (
    <div className="h-full rounded-xl bg-gradient-to-r from-[hsl(250,84%,54%)] to-[hsl(262,83%,58%)] px-6 py-4 flex items-center justify-between relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-1/2 w-32 h-32 bg-white/5 rounded-full blur-2xl translate-y-1/2" />
      
      {/* Left: Greeting */}
      <div className="relative z-10 flex items-center gap-4">
        <div className="hidden sm:flex p-3 rounded-xl bg-white/15 backdrop-blur-sm">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            {getGreeting()}, {user?.name?.split(' ')[0] || getGuestText()}!
          </h1>
          <p className="text-white/70 text-sm capitalize">
            {formattedDate}
          </p>
        </div>
      </div>

      {/* Right: Motivational text */}
      <div className="relative z-10 hidden md:block text-right">
        <p className="text-white/90 text-sm font-medium">
          {getMotivationalText()}
        </p>
      </div>
    </div>
  );
}
