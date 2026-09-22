export type SpeechStatus = "idle" | "listening" | "processing" | "denied" | "unsupported" | "timeout" | "error";

export interface SpeechState {
  status: SpeechStatus;
  interim: string;
  message: string | null;
  manualRequested: boolean;
}

export type SpeechAction =
  | { type: "support"; supported: boolean }
  | { type: "start" }
  | { type: "interim"; text: string }
  | { type: "final" }
  | { type: "end" }
  | { type: "fail"; reason: "denied" | "timeout" | "error"; message: string }
  | { type: "toggle-manual" };

export const INITIAL_SPEECH_STATE: SpeechState = { status: "idle", interim: "", message: null, manualRequested: false };

const FAILURE_STATUSES: ReadonlySet<SpeechStatus> = new Set(["denied", "unsupported", "timeout", "error"]);

export function speechReducer(state: SpeechState, action: SpeechAction): SpeechState {
  switch (action.type) {
    case "support":
      return action.supported
        ? state
        : { ...state, status: "unsupported", message: "Voice capture is not available on this device. Type the job instead." };
    case "start":
      if (state.status === "unsupported") {
        return state;
      }
      return { status: "listening", interim: "", message: null, manualRequested: state.manualRequested };
    case "interim":
      return state.status === "listening" ? { ...state, interim: action.text } : state;
    case "final":
      return state.status === "listening" ? { ...state, interim: "" } : state;
    case "end":
      if (state.status === "listening") {
        return { ...state, status: "processing", interim: "" };
      }
      return state.status === "processing" ? { ...state, status: "idle" } : state;
    case "fail":
      return { status: action.reason, interim: "", message: action.message, manualRequested: state.manualRequested };
    case "toggle-manual":
      return { ...state, manualRequested: !state.manualRequested };
  }
}

export function manualPanelVisible(state: SpeechState): boolean {
  return state.manualRequested || FAILURE_STATUSES.has(state.status);
}
