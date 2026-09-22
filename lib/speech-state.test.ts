import { describe, expect, it } from "vitest";
import { INITIAL_SPEECH_STATE, manualPanelVisible, speechReducer, type SpeechState } from "@/lib/speech-state";

const listening: SpeechState = speechReducer(INITIAL_SPEECH_STATE, { type: "start" });

describe("speechReducer", () => {
  it("moves idle to listening to processing to idle", () => {
    expect(listening.status).toBe("listening");
    const processing = speechReducer(listening, { type: "end" });
    expect(processing.status).toBe("processing");
    expect(speechReducer(processing, { type: "end" }).status).toBe("idle");
  });

  it("tracks interim text only while listening and clears it on a final result", () => {
    const withInterim = speechReducer(listening, { type: "interim", text: "hilux fu" });
    expect(withInterim.interim).toBe("hilux fu");
    expect(speechReducer(withInterim, { type: "final" }).interim).toBe("");
    expect(speechReducer(INITIAL_SPEECH_STATE, { type: "interim", text: "x" }).interim).toBe("");
  });

  it.each(["denied", "timeout", "error"] as const)("shows the manual panel after %s", (reason) => {
    const failed = speechReducer(listening, { type: "fail", reason, message: "m" });
    expect(failed.status).toBe(reason);
    expect(failed.message).toBe("m");
    expect(manualPanelVisible(failed)).toBe(true);
  });

  it("marks unsupported browsers and refuses to start", () => {
    const unsupported = speechReducer(INITIAL_SPEECH_STATE, { type: "support", supported: false });
    expect(unsupported.status).toBe("unsupported");
    expect(manualPanelVisible(unsupported)).toBe(true);
    expect(speechReducer(unsupported, { type: "start" }).status).toBe("unsupported");
  });

  it("lets the crew retry after a failure", () => {
    const denied = speechReducer(listening, { type: "fail", reason: "denied", message: "m" });
    expect(speechReducer(denied, { type: "start" }).status).toBe("listening");
  });

  it("keeps the manual panel open on request", () => {
    const toggled = speechReducer(INITIAL_SPEECH_STATE, { type: "toggle-manual" });
    expect(manualPanelVisible(toggled)).toBe(true);
    expect(manualPanelVisible(INITIAL_SPEECH_STATE)).toBe(false);
    expect(speechReducer(toggled, { type: "start" }).manualRequested).toBe(true);
  });
});
