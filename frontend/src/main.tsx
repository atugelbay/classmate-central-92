import { createRoot } from "react-dom/client";
import moment from "moment";
// Импортируем русскую локаль явно
import "moment/dist/locale/ru";
import "moment/dist/locale/kk";
import App from "./App.tsx";
import "./index.css";

// Import i18n configuration (must be before App)
import "./i18n";

// Глобально ставим русскую локаль для moment.js
console.log("Available locales BEFORE:", moment.locales());
moment.locale("ru");
console.log("Moment locale set to:", moment.locale());
console.log("Available locales AFTER:", moment.locales());

createRoot(document.getElementById("root")!).render(<App />);
