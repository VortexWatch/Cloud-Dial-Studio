import { useRef, useState } from "react";
import "./App.css";

import { useProjectStore } from "./core/useProjectStore";
import {
  newProject, openProjectFromFileList, addWatchWidget, addCustomWidget,
  addGenericWidget, selectWidget, deleteWidget, setWidgetPosition,
  applyWidgetChanges, uploadBackground, setPreviewTime, saveIwfJsonDownload,
  saveFontJsonDownload, createZipDownload, savePreviewDownload, currentRootJson,
  setDevice, HandConfigInput,
} from "./core/actions";
import { prettyJson, fontJsonDisplayText } from "./iwf/IWFParser";
import { INT_KEYS, PreviewTime } from "./iwf/types";
import { deviceProfileOf } from "./core/Scene";

import Toolbar from "./components/Toolbar";
import WidgetPanel from "./components/WidgetPanel";
import PropertiesPanel from "./components/PropertiesPanel";
import WatchCanvas from "./components/WatchCanvas";
import NewProjectDialog from "./components/dialogs/NewProjectDialog";
import ClockHandsDialog from "./components/dialogs/ClockHandsDialog";
import AddCustomWidgetDialog from "./components/dialogs/AddCustomWidgetDialog";
import BackgroundHelperDialog from "./components/dialogs/BackgroundHelperDialog";

type DialogState =
  | { kind: "none" }
  | { kind: "newProject" }
  | { kind: "addWatch" }
  | { kind: "addCustom"; typeVal: string }
  | { kind: "backgroundHelper" };

export default function App() {
  const { state, imageCache, notify, tick } = useProjectStore();
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  const [status, setStatus] = useState("Create a new project or open an existing one to begin.");
  const fileCounter = useRef({ current: 0 });

  const currentEntry = state.currentWidgetIndex >= 0 ? state.widgetList[state.currentWidgetIndex] ?? null : null;

  // -- Toolbar handlers ----------------------------------------------
  const handleOpenProjectFolder = async (files: FileList) => {
    try {
      const result = await openProjectFromFileList(state, imageCache, notify, files);
      if (!result) {
        setStatus("No iwf.json found in the selected folder.");
        return;
      }
      setStatus(
        `Loaded ${result.loaded} widget(s) from the project`
        + (result.skipped > 0 ? ` (${result.skipped} unsupported widget(s) skipped)` : ""),
      );
    } catch (e) {
      setStatus(`Could not open project: ${(e as Error).message}`);
    }
  };

  const handleUploadBackground = async (file: File) => {
    const err = await uploadBackground(state, imageCache, notify, file, fileCounter.current);
    if (err) alert(err);
  };

  const handlePreviewTimeChange = (time: PreviewTime) => setPreviewTime(state, notify, time);

  // -- Widget panel handlers ------------------------------------------
  const handleRequestAdd = (widgetKind: string, typeVal: string) => {
    if (widgetKind === "watch" && typeVal === "time") {
      setDialog({ kind: "addWatch" });
    } else if (widgetKind === "custom") {
      setDialog({ kind: "addCustom", typeVal });
    } else {
      addGenericWidget(state, notify, widgetKind, typeVal);
    }
  };

  const handleConfirmWatch = async (hands: { hour: HandConfigInput; minute: HandConfigInput; second: HandConfigInput }) => {
    await addWatchWidget(state, imageCache, notify, hands);
    setDialog({ kind: "none" });
  };

  const handleConfirmCustom = async (folderName: string, files: File[]) => {
    if (dialog.kind !== "addCustom") return;
    await addCustomWidget(state, imageCache, notify, dialog.typeVal, folderName, files);
    setDialog({ kind: "none" });
  };

  // -- Properties panel handlers ---------------------------------------
  const handleLivePosition = (x: number, y: number) => setWidgetPosition(state, notify, x, y);
  const handleApply = (
    xywh: { x: number; y: number; w: number; h: number },
    scrollValues: Record<string, { checked: boolean; value: string }>,
  ) => applyWidgetChanges(state, notify, xywh, scrollValues, INT_KEYS);

  const jsonText = prettyJson(currentRootJson(state));
  const fontJsonText = fontJsonDisplayText(state.fontJsonItems);

  return (
    <div className="app">
      <Toolbar
        projectOpen={state.projectOpen}
        status={status}
        previewTime={state.previewTime}
        deviceId={deviceProfileOf(state).id}
        onDeviceChange={(id) => setDevice(state, notify, id)}
        onNewProject={() => setDialog({ kind: "newProject" })}
        onOpenProjectFolder={handleOpenProjectFolder}
        onSaveIwfJson={() => saveIwfJsonDownload(state)}
        onSaveFontJson={() => saveFontJsonDownload(state)}
        onCreateZip={() => createZipDownload(state)}
        onSavePreview={() => savePreviewDownload(state, imageCache, notify)}
        onUploadBackground={handleUploadBackground}
        onEditBackground={() => setDialog({ kind: "backgroundHelper" })}
        onPreviewTimeChange={handlePreviewTimeChange}
      />

      <div className="main-body">
        <WidgetPanel
          projectOpen={state.projectOpen}
          widgetList={state.widgetList}
          currentIndex={state.currentWidgetIndex}
          onSelect={(i) => selectWidget(state, notify, i)}
          onDelete={(i) => deleteWidget(state, notify, i)}
          onRequestAdd={handleRequestAdd}
        />

        <div className="canvas-panel">
          <WatchCanvas state={state} imageCache={imageCache} tick={tick} />
          <div style={{ fontSize: 11, color: "var(--text-1)" }}>
            {deviceProfileOf(state).canvasW} × {deviceProfileOf(state).canvasH} · {deviceProfileOf(state).id} canvas
          </div>
        </div>

        <PropertiesPanel
          entry={currentEntry}
          currentIndex={state.currentWidgetIndex}
          canvasW={deviceProfileOf(state).canvasW}
          canvasH={deviceProfileOf(state).canvasH}
          onLivePosition={handleLivePosition}
          onApply={handleApply}
          jsonText={jsonText}
          fontJsonText={fontJsonText}
        />
      </div>

      {dialog.kind === "newProject" && (
        <NewProjectDialog
          onCreate={(name, deviceId) => {
            newProject(state, notify, name, deviceId);
            setStatus(`Project "${name}" created (${deviceId}).`);
            setDialog({ kind: "none" });
          }}
          onCancel={() => setDialog({ kind: "none" })}
        />
      )}

      {dialog.kind === "addWatch" && (
        <ClockHandsDialog
          defaultAnchorX={deviceProfileOf(state).anchorX}
          defaultAnchorY={deviceProfileOf(state).anchorY}
          onConfirm={handleConfirmWatch}
          onCancel={() => setDialog({ kind: "none" })}
        />
      )}

      {dialog.kind === "addCustom" && (
        <AddCustomWidgetDialog
          typeVal={dialog.typeVal}
          onConfirm={handleConfirmCustom}
          onCancel={() => setDialog({ kind: "none" })}
        />
      )}

      {dialog.kind === "backgroundHelper" && (
        <BackgroundHelperDialog
          maxW={deviceProfileOf(state).canvasW}
          maxH={deviceProfileOf(state).canvasH}
          onClose={() => setDialog({ kind: "none" })}
        />
      )}
    </div>
  );
}
