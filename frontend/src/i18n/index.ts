import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files - Russian
import ruCommon from './locales/ru/common.json';
import ruNavigation from './locales/ru/navigation.json';
import ruStudents from './locales/ru/students.json';
import ruSchedule from './locales/ru/schedule.json';
import ruFinance from './locales/ru/finance.json';
import ruDashboard from './locales/ru/dashboard.json';
import ruSettings from './locales/ru/settings.json';
import ruAuth from './locales/ru/auth.json';
import ruGroups from './locales/ru/groups.json';
import ruTeachers from './locales/ru/teachers.json';
import ruLeads from './locales/ru/leads.json';
import ruSubscriptions from './locales/ru/subscriptions.json';
import ruIndividual from './locales/ru/individual.json';
import ruRoles from './locales/ru/roles.json';

// Import translation files - Kazakh
import kkCommon from './locales/kk/common.json';
import kkNavigation from './locales/kk/navigation.json';
import kkStudents from './locales/kk/students.json';
import kkSchedule from './locales/kk/schedule.json';
import kkFinance from './locales/kk/finance.json';
import kkDashboard from './locales/kk/dashboard.json';
import kkSettings from './locales/kk/settings.json';
import kkAuth from './locales/kk/auth.json';
import kkGroups from './locales/kk/groups.json';
import kkTeachers from './locales/kk/teachers.json';
import kkLeads from './locales/kk/leads.json';
import kkSubscriptions from './locales/kk/subscriptions.json';
import kkIndividual from './locales/kk/individual.json';
import kkRoles from './locales/kk/roles.json';

// Import translation files - English
import enCommon from './locales/en/common.json';
import enNavigation from './locales/en/navigation.json';
import enStudents from './locales/en/students.json';
import enSchedule from './locales/en/schedule.json';
import enFinance from './locales/en/finance.json';
import enDashboard from './locales/en/dashboard.json';
import enSettings from './locales/en/settings.json';
import enAuth from './locales/en/auth.json';
import enGroups from './locales/en/groups.json';
import enTeachers from './locales/en/teachers.json';
import enLeads from './locales/en/leads.json';
import enSubscriptions from './locales/en/subscriptions.json';
import enIndividual from './locales/en/individual.json';
import enRoles from './locales/en/roles.json';

export const languages = [
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'kk', name: 'Қазақша', flag: '🇰🇿' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
] as const;

export type LanguageCode = typeof languages[number]['code'];

const resources = {
  ru: {
    common: ruCommon,
    navigation: ruNavigation,
    students: ruStudents,
    schedule: ruSchedule,
    finance: ruFinance,
    dashboard: ruDashboard,
    settings: ruSettings,
    auth: ruAuth,
    groups: ruGroups,
    teachers: ruTeachers,
    leads: ruLeads,
    subscriptions: ruSubscriptions,
    individual: ruIndividual,
    roles: ruRoles,
  },
  kk: {
    common: kkCommon,
    navigation: kkNavigation,
    students: kkStudents,
    schedule: kkSchedule,
    finance: kkFinance,
    dashboard: kkDashboard,
    settings: kkSettings,
    auth: kkAuth,
    groups: kkGroups,
    teachers: kkTeachers,
    leads: kkLeads,
    subscriptions: kkSubscriptions,
    individual: kkIndividual,
    roles: kkRoles,
  },
  en: {
    common: enCommon,
    navigation: enNavigation,
    students: enStudents,
    schedule: enSchedule,
    finance: enFinance,
    dashboard: enDashboard,
    settings: enSettings,
    auth: enAuth,
    groups: enGroups,
    teachers: enTeachers,
    leads: enLeads,
    subscriptions: enSubscriptions,
    individual: enIndividual,
    roles: enRoles,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ru',
    defaultNS: 'common',
    ns: ['common', 'navigation', 'students', 'schedule', 'finance', 'dashboard', 'settings', 'auth', 'groups', 'teachers', 'leads', 'subscriptions', 'individual', 'roles'],
    
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'language',
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    react: {
      useSuspense: false,
    },
  });

export default i18n;
