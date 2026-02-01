import { create } from "zustand";
import { Settings } from "@/types";

interface Store {
  settings: Settings;
}

export const useStore = create<Store>()(() => ({
  settings: {
    centerName: "Neosmart",
    themeColor: "#8B5CF6",
  },
}));
