import { type Keyboard, type KeyId, useKeyboard } from "@keybr/keyboard";
import { type Result } from "@keybr/result";
import { type LineList } from "@keybr/textinput";
import {
  addKey,
  deleteKey,
  emulateLayout,
  type IInputEvent,
} from "@keybr/textinput-events";
import { makeSoundPlayer } from "@keybr/textinput-sounds";
import {
  Alert,
  toast,
  useDocumentEvent,
  useHotkeys,
  useTimeout,
  useWindowEvent,
} from "@keybr/widget";
import { memo, type ReactNode, useMemo, useRef, useState } from "react";
import { Presenter } from "./Presenter.tsx";
import {
  type LastLesson,
  LessonState,
  makeLastLesson,
  type Progress,
} from "./state/index.ts";

export const Controller = memo(function Controller({
  progress,
  onResult,
}: {
  readonly progress: Progress;
  readonly onResult: (result: Result) => void;
}): ReactNode {
  const {
    state,
    handleResetLesson,
    handleSkipLesson,
    handleKeyDown,
    handleKeyUp,
    handleInput,
  } = useLessonState(progress, onResult);
  useHotkeys({
    ["Ctrl+ArrowLeft"]: handleResetLesson,
    ["Ctrl+ArrowRight"]: handleSkipLesson,
    ["Escape"]: handleResetLesson,
  });
  useWindowEvent("focus", handleResetLesson);
  useWindowEvent("blur", handleResetLesson);
  useDocumentEvent("visibilitychange", handleResetLesson);
  return (
    <Presenter
      state={state}
      lines={state.lines}
      depressedKeys={state.depressedKeys}
      onResetLesson={handleResetLesson}
      onSkipLesson={handleSkipLesson}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onInput={handleInput}
    />
  );
});

function useLessonState(
  progress: Progress,
  onResult: (result: Result) => void,
) {
  const keyboard = useKeyboard();
  const timeout = useTimeout();
  const [key, setKey] = useState(0); // Creates new LessonState instances.
  const [, setLines] = useState<LineList>({ text: "", lines: [] }); // Forces UI update.
  const [, setDepressedKeys] = useState<readonly KeyId[]>([]); // Forces UI update.
  const lastLessonRef = useRef<LastLesson | null>(null);

  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const lastLayoutWarningRef = useRef(0);

  return useMemo(() => {
    // New lesson.
    const state = new LessonState(progress, (result, textInput) => {
      setKey(key + 1);
      lastLessonRef.current = makeLastLesson(result, textInput.steps);
      onResultRef.current(result);
    });
    state.lastLesson = lastLessonRef.current;
    setLines(state.lines);
    setDepressedKeys(state.depressedKeys);
    const handleResetLesson = () => {
      state.resetLesson();
      setLines(state.lines);
      setDepressedKeys((state.depressedKeys = []));
      timeout.cancel();
    };
    const handleSkipLesson = () => {
      state.skipLesson();
      setLines(state.lines);
      setDepressedKeys((state.depressedKeys = []));
      timeout.cancel();
    };
    const playSounds = makeSoundPlayer(state.settings);
    const { onKeyDown, onKeyUp, onInput } = emulateLayout(
      state.settings,
      keyboard,
      {
        onKeyDown: (event) => {
          setDepressedKeys(
            (state.depressedKeys = addKey(state.depressedKeys, event.code)),
          );
        },
        onKeyUp: (event) => {
          setDepressedKeys(
            (state.depressedKeys = deleteKey(state.depressedKeys, event.code)),
          );
        },
        onInput: (event) => {
          warnOnLayoutMismatch(event, keyboard, lastLayoutWarningRef);
          state.lastLesson = null;
          const feedback = state.onInput(event);
          setLines(state.lines);
          playSounds(feedback);
          timeout.schedule(handleResetLesson, 10000);
        },
      },
    );
    return {
      state,
      handleResetLesson,
      handleSkipLesson,
      handleKeyDown: onKeyDown,
      handleKeyUp: onKeyUp,
      handleInput: onInput,
    };
  }, [progress, keyboard, timeout, key]);
}

const LAYOUT_WARNING_INTERVAL = 5000;

// Detects when the typed character is a letter that the selected keyboard
// layout cannot produce (e.g. a Cyrillic letter typed while the OS keyboard is
// set to a non-Latin layout). In that case the key shows up on the on-screen
// keyboard but never matches the lesson, so we nudge the user once in a while.
function warnOnLayoutMismatch(
  event: IInputEvent,
  keyboard: Keyboard,
  lastWarningRef: { current: number },
): void {
  if (event.inputType !== "appendChar") {
    return;
  }
  const { codePoint } = event;
  if (codePoint <= 0x0000) {
    return;
  }
  const char = String.fromCodePoint(codePoint);
  if (!/\p{L}/u.test(char)) {
    return; // Only letters indicate a layout mismatch.
  }
  if (keyboard.getCombo(codePoint) != null) {
    return; // The character belongs to the current layout.
  }
  const now = Date.now();
  if (now - lastWarningRef.current < LAYOUT_WARNING_INTERVAL) {
    return;
  }
  lastWarningRef.current = now;
  toast(
    <Alert severity="info" closeButton={true}>
      {"The keys you are typing don't belong to this keyboard layout. " +
        "Switch your operating system's keyboard layout (for example, to " +
        "English) to start practicing."}
    </Alert>,
    { autoClose: 6000 },
  );
}
