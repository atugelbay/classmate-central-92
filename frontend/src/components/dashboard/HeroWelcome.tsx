import { useAuth } from "@/context/AuthContext";
import { Sparkles } from "lucide-react";

// Function to get greeting based on time of day
const getGreeting = (): string => {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 12) {
    return "Доброе утро";
  } else if (hour >= 12 && hour < 18) {
    return "Добрый день";
  } else if (hour >= 18 && hour < 23) {
    return "Добрый вечер";
  } else {
    return "Доброй ночи";
  }
};

export function HeroWelcome() {
  const { user } = useAuth();
  const today = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  };
  const formattedDate = today.toLocaleDateString('ru-RU', dateOptions);

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
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Гость'}!
          </h1>
          <p className="text-white/70 text-sm capitalize">
            {formattedDate}
          </p>
        </div>
      </div>

      {/* Right: Motivational text */}
      <div className="relative z-10 hidden md:block text-right">
        <p className="text-white/90 text-sm font-medium">
          Отличного продуктивного дня!
        </p>
      </div>
    </div>
  );
}
