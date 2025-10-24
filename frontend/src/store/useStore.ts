import { create } from "zustand";
import { Settings } from "@/types";

interface Store {
  settings: Settings;
}

export const useStore = create<Store>()(() => ({
  settings: {
    centerName: "Образовательный Центр",
    themeColor: "#8B5CF6",
  },
}));
