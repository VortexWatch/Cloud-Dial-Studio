import {
  WidgetEntry, RootJson, FontJsonItem, PreviewTime, DEFAULT_PREVIEW_VALUES,
  DeviceProfile, getDeviceProfile, DEFAULT_DEVICE,
} from "../iwf/types";
import { ProjectFiles } from "./ProjectFiles";

/** Mirrors the free-floating instance state MainWindow keeps on `self`. */
export interface ProjectState {
  projectOpen: boolean;
  projectName: string;
  root: RootJson;
  widgetList: WidgetEntry[];
  currentWidgetIndex: number;
  fontJsonItems: FontJsonItem[];
  previewTime: PreviewTime;
  previewValues: Record<string, string>;
  files: ProjectFiles;
}

export function createEmptyProject(): ProjectState {
  const profile = DEVICE_PROFILES_DEFAULT();
  return {
    projectOpen: false,
    projectName: "",
    root: {
      version: 1,
      clouddialversion: 3,
      preview: "preview.png",
      name: "",
      author: "admin",
      description: profile.id,
      deviceId: profile.id,
      bluetooth: false,
      disturb: false,
      battery: false,
      compress: "LZ4",
      item: [],
      bkground: "",
    },
    widgetList: [],
    currentWidgetIndex: -1,
    fontJsonItems: [],
    previewTime: { hour: 10, minute: 8, second: 36 },
    previewValues: { ...DEFAULT_PREVIEW_VALUES },
    files: new ProjectFiles(),
  };
}

function DEVICE_PROFILES_DEFAULT(): DeviceProfile {
  return getDeviceProfile(DEFAULT_DEVICE);
}

/** Resolves the current project's device profile (canvas size, hand anchor, preview size/radius). */
export function deviceProfileOf(state: ProjectState): DeviceProfile {
  return getDeviceProfile(state.root.deviceId);
}

/** Port of MainWindow.get_weekday_string() — Monday-first, mirrors QDate.dayOfWeek(). */
const WEEKDAYS = ["en_mon", "en_tue", "en_wed", "en_thu", "en_fri", "en_sat", "en_sun"];
export function weekdayString(date: Date): string {
  const isoDay = date.getDay() === 0 ? 7 : date.getDay(); // 1=Mon..7=Sun
  return WEEKDAYS[isoDay - 1];
}

/**
 * Port of the PREVIEW_VALUES.update(...) block inside
 * on_preview_time_changed(). Returns a new previewValues map.
 */
export function derivePreviewValues(
  base: Record<string, string>,
  time: PreviewTime,
): Record<string, string> {
  const hour12 = time.hour % 12 || 12;
  const mm = String(time.minute).padStart(2, "0");
  const ss = String(time.second).padStart(2, "0");
  const hh = String(time.hour).padStart(2, "0");

  return {
    ...base,
    time: `${hh}:${mm}`,
    hour: String(hour12),
    hourhi: hour12 >= 10 ? String(Math.floor(hour12 / 10)) : " ",
    hourlo: String(hour12 % 10),
    min: mm,
    minhi: mm[0],
    minlo: mm[1],
    second: ss,
    apm: time.hour >= 12 ? "en_pm" : "en_am",
  };
}

/** Port of the "find the last watch widget" loop in render_watch_hands(). */
export function findLastWatchEntry(widgetList: WidgetEntry[]): WidgetEntry | null {
  for (let i = widgetList.length - 1; i >= 0; i--) {
    if (widgetList[i].widgetType === "watch") return widgetList[i];
  }
  return null;
}
