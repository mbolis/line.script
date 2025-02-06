import type { JSX } from "@/jsx";
import _ from "./editor.module.css";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { bracketMatching, defaultHighlightStyle, ensureSyntaxTree, syntaxHighlighting } from "@codemirror/language";
import { EditorState, StateEffect, StateField } from "@codemirror/state";
import { Decoration, drawSelection, dropCursor, EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from "@codemirror/view";
import { debounce } from "../util";

export interface EditorProps {
  value: flyd.Stream<string>;
  onchange?: (doc: DocState) => void;
  currentInstruction: flyd.Stream<Mark | null>;
  errors: flyd.Stream<Mark[]>;
}

class DocState {
  constructor(private readonly state: EditorState) { }

  get text() {
    return this.state.doc.toString();
  }

  getToken(line: number, ch: number): Token {
    const { doc } = this.state;
    const pos = doc.line(line).from + ch
    const { from, to } = ensureSyntaxTree(this.state, doc.length).resolve(pos, 1);
    return { from, to, text: doc.sliceString(from, to) };
  }
}

interface Token {
  from: number;
  to: number;
  text: string;
}

export type Mark = [number, number];

const instructionMark = Decoration.mark({
  attributes: { style: "background-color: rgb(128 255 128 / 40%)" },
});

const errorMark = Decoration.mark({
  attributes: { style: "background-color: rgb(255 128 128 / 40%)" },
});

const markCurrentInstruction = StateEffect.define<Mark>({
  map: ([from, to], change) => [change.mapPos(from), change.mapPos(to)],
});
const markErrors = StateEffect.define<Mark[]>({
  map: (errs, change) => errs.map(([from, to]) => [change.mapPos(from), change.mapPos(to)]),
});
const clearMarks = StateEffect.define(); // TODO: handle more graciously

const marksField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(marks, tx) {
    marks = marks.map(tx.changes);
    for (const effect of tx.effects) {
      if (effect.is(markCurrentInstruction)) {
        const [from, to] = effect.value;
        marks = marks
          .update({ filter: (_from, _to, v) => v !== instructionMark })
          .update({ add: [instructionMark.range(from, to)] });
      } else if (effect.is(markErrors)) {
        marks = marks
          .update({ filter: (_from, _to, v) => v !== errorMark })
          .update({ add: effect.value.map(([from, to]) => errorMark.range(from, to)), sort: true });
      } else if (effect.is(clearMarks)) {
        marks = marks.update({ filter: () => false })
      }
    }
    return marks;
  },
  provide: f => EditorView.decorations.from(f),
});

export const Editor: JSX.Component<EditorProps> = ({
  value,
  onchange,
  currentInstruction,
  errors,
}) => {
  onchange = debounce(onchange, 400);

  const editor = new EditorView({
    extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(), //
      history(),
      drawSelection(),
      dropCursor(),
      syntaxHighlighting(defaultHighlightStyle),
      bracketMatching(),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        indentWithTab,
      ]),
      javascript(),
      EditorState.tabSize.of(2),
      marksField,
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          onchange(new DocState(update.state));
        }
      }),
    ],
    doc: value(),
  });

  value.map(value => editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: value },
  }))

  currentInstruction.map(ci => {
    if (ci) {
      editor.dispatch({
        effects: markCurrentInstruction.of(ci),
      });
    } else {
      editor.dispatch({
        effects: clearMarks.of(null),
      });
    }
  });

  errors.map(errs => {
    editor.dispatch({
      effects: markErrors.of(errs),
    });
  });

  editor.dom.classList.add(_.editor);
  return editor.dom;
}
