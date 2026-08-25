// brainfuck-visualizer.js
// Single-file ES module: a Brainfuck interpreter visualizer built with Preact + htm.
//
// Usage (no build step required):
//
//   <div id="app"></div>
//   <script type="module">
//     import { render } from 'https://esm.sh/preact@10.19.3';
//     import { html, BrainfuckVisualizer } from './brainfuck-visualizer.js';
//     render(html`<${BrainfuckVisualizer} />`, document.getElementById('app'));
//   </script>
//
// Or just import it for its side effect of auto-mounting into
// any element matching `[data-brainfuck-visualizer]` / `#app` (see bottom of file).

import { render } from 'preact';
import { useState, useRef, useEffect, useCallback } from 'preact/hooks';
import { html } from "htm/preact";

/* ============ styles (injected once) ============ */

const CSS = `
.bfv{
  --bfv-bg: #f2f3ef;
  --bfv-panel: #ffffff;
  --bfv-panel-border: #e2e4dc;
  --bfv-ink: #23261f;
  --bfv-ink-soft: #75796c;
  --bfv-ink-faint: #a9ac9f;
  --bfv-accent: #b5563a;
  --bfv-accent-soft: rgba(181, 86, 58, 0.13);
  --bfv-move: #4c6b8a;
  --bfv-move-soft: rgba(76, 107, 138, 0.13);
  --bfv-value: #a9791f;
  --bfv-value-soft: rgba(169, 121, 31, 0.15);
  --bfv-io: #2f8f74;
  --bfv-io-soft: rgba(47, 143, 116, 0.14);
  --bfv-loop: #7a5ea8;
  --bfv-loop-soft: rgba(122, 94, 168, 0.14);
  --bfv-grid-empty: #edeeea;
  --bfv-font-ui: 'Inter', system-ui, -apple-system, sans-serif;
  --bfv-font-mono: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace;

  max-width: 900px;
  margin: 0 auto;
  color: var(--bfv-ink);
  font-family: var(--bfv-font-ui);
  -webkit-font-smoothing: antialiased;
  box-sizing: border-box;
}
.bfv *, .bfv *::before, .bfv *::after{ box-sizing: border-box; }

.bfv .header{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:18px; flex-wrap:wrap; }
.bfv .title-block{ display:flex; align-items:center; gap:10px; }
.bfv .title{ font-size:14px; font-weight:600; letter-spacing:0.01em; }
.bfv .status{ display:flex; align-items:center; gap:6px; font-size:11.5px; color:var(--bfv-ink-soft); font-family:var(--bfv-font-mono); }
.bfv .status-dot{ width:6px; height:6px; border-radius:50%; background:var(--bfv-ink-faint); transition:background-color .2s ease; }
.bfv .status-dot.running{ background:var(--bfv-accent); }
.bfv .status-dot.halted{ background:var(--bfv-io); }
.bfv .status-dot.error{ background:#c94b3f; }

.bfv .controls{ display:flex; gap:8px; align-items:center; }
.bfv .btn{ font-family:var(--bfv-font-ui); font-size:12.5px; font-weight:500; padding:7px 15px; border-radius:6px; border:1px solid var(--bfv-panel-border); background:#fff; color:var(--bfv-ink); cursor:pointer; transition:background-color .15s ease, border-color .15s ease, transform .1s ease; }
.bfv .btn:hover:not(:disabled){ border-color:var(--bfv-ink-faint); }
.bfv .btn:active:not(:disabled){ transform:translateY(1px); }
.bfv .btn:disabled{ opacity:0.4; cursor:not-allowed; }
.bfv .btn:focus-visible{ outline:2px solid var(--bfv-accent); outline-offset:2px; }
.bfv .btn-run{ background:var(--bfv-accent); border-color:var(--bfv-accent); color:#fff; font-weight:600; }
.bfv .btn-run:hover:not(:disabled){ background:#a04a31; border-color:#a04a31; }
.bfv .btn-speed{ font-family:var(--bfv-font-mono); min-width:46px; text-align:center; }

.bfv .config{ background:var(--bfv-panel); border:1px solid var(--bfv-panel-border); border-radius:8px; padding:16px 18px; margin-bottom:16px; }
.bfv .config-row{ display:flex; gap:16px; flex-wrap:wrap; margin-bottom:12px; }
.bfv .config-row:last-child{ margin-bottom:0; }
.bfv .field{ flex:1 1 260px; display:flex; flex-direction:column; gap:6px; }
.bfv .field label{ font-size:11px; color:var(--bfv-ink-soft); font-weight:500; letter-spacing:0.02em; }
.bfv .field textarea{ font-family:var(--bfv-font-mono); font-size:12.5px; line-height:1.5; padding:9px 10px; border-radius:6px; border:1px solid var(--bfv-panel-border); background:#fafaf8; color:var(--bfv-ink); resize:vertical; min-height:54px; }
.bfv .field textarea:focus-visible, .bfv .field select:focus-visible{ outline:2px solid var(--bfv-accent); outline-offset:1px; }
.bfv .field select{ font-family:var(--bfv-font-ui); font-size:12.5px; padding:7px 9px; border-radius:6px; border:1px solid var(--bfv-panel-border); background:#fafaf8; color:var(--bfv-ink); }
.bfv .hint{ font-size:11px; color:var(--bfv-accent); font-weight:500; }
.bfv .error-hint{ font-size:11.5px; color:#c94b3f; font-family:var(--bfv-font-mono); }

.bfv .panel{ background:var(--bfv-panel); border:1px solid var(--bfv-panel-border); border-radius:8px; padding:14px 16px 16px; margin-bottom:14px; }
.bfv .panel-label{ display:flex; justify-content:space-between; align-items:baseline; font-size:12px; color:var(--bfv-ink-soft); margin-bottom:10px; }
.bfv .panel-label .count{ font-family:var(--bfv-font-mono); color:var(--bfv-ink-faint); font-size:11px; }
.bfv .empty-note{ font-size:12px; color:var(--bfv-ink-faint); font-style:italic; padding:6px 2px; }

.bfv .cell{ display:flex; align-items:center; justify-content:center; border-radius:3px; background:var(--bfv-grid-empty); color:var(--bfv-ink-faint); font-family:var(--bfv-font-mono); user-select:none; transition:background-color .12s ease, color .12s ease, box-shadow .12s ease; }

.bfv .tape-grid{ display:grid; grid-template-columns:repeat(16, 1fr); gap:4px; }
.bfv .tape-cell{ aspect-ratio:1; font-size:9px; }
.bfv .tape-cell.nonzero{ background:#e4ded6; color:var(--bfv-ink); }
.bfv .tape-cell.ptr{ box-shadow:0 0 0 2px var(--bfv-accent) inset; color:var(--bfv-ink); font-weight:600; }
.bfv .tape-cell.flash{ background:var(--bfv-accent-soft); box-shadow:0 0 0 2px var(--bfv-accent) inset; color:var(--bfv-ink); }

.bfv .prog-grid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(20px, 1fr)); gap:3px; }
.bfv .prog-cell{ aspect-ratio:1; font-size:11px; font-weight:600; }
.bfv .prog-cell.cat-move{ background:var(--bfv-move-soft); color:var(--bfv-move); }
.bfv .prog-cell.cat-value{ background:var(--bfv-value-soft); color:var(--bfv-value); }
.bfv .prog-cell.cat-io{ background:var(--bfv-io-soft); color:var(--bfv-io); }
.bfv .prog-cell.cat-loop{ background:var(--bfv-loop-soft); color:var(--bfv-loop); }
.bfv .prog-cell.past{ opacity:0.4; }
.bfv .prog-cell.current{ background:var(--bfv-accent); color:#fff; box-shadow:0 0 0 2px var(--bfv-accent); transform:scale(1.08); }

.bfv .io-grid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(18px, 1fr)); gap:3px; max-height:190px; overflow-y:auto; }
.bfv .io-cell{ aspect-ratio:1; font-size:11px; }
.bfv .io-cell.consumed{ opacity:0.35; }
.bfv .io-cell.current{ box-shadow:0 0 0 2px var(--bfv-accent) inset; color:var(--bfv-ink); background:var(--bfv-accent-soft); font-weight:600; }
.bfv .io-cell.written{ background:var(--bfv-io-soft); color:var(--bfv-io); font-weight:600; }
.bfv .io-cell.flash{ box-shadow:0 0 0 2px var(--bfv-accent) inset; }

.bfv .result-box{ margin-top:10px; background:#fafaf8; border:1px solid var(--bfv-panel-border); border-radius:6px; padding:8px 10px; font-family:var(--bfv-font-mono); font-size:12.5px; white-space:pre-wrap; word-break:break-word; min-height:20px; color:var(--bfv-ink); }
.bfv .result-box:empty::before{ content:"—"; color:var(--bfv-ink-faint); }

.bfv .legend{ display:flex; flex-wrap:wrap; gap:16px; padding:10px 4px 2px; font-size:11px; color:var(--bfv-ink-soft); }
.bfv .legend-item{ display:flex; align-items:center; gap:6px; }
.bfv .swatch{ width:10px; height:10px; border-radius:2px; flex-shrink:0; }

.bfv .stats{ display:flex; flex-wrap:wrap; gap:26px; border-top:1px solid var(--bfv-panel-border); margin-top:6px; padding-top:14px; justify-content:space-between; }
.bfv .stat .label{ font-size:10.5px; color:var(--bfv-ink-soft); letter-spacing:0.03em; margin-bottom:3px; }
.bfv .stat .value{ font-family:var(--bfv-font-mono); font-size:14px; font-weight:600; color:var(--bfv-ink); }

@media (prefers-reduced-motion: reduce){ .bfv *{ transition:none !important; } }
@media (max-width: 560px){ .bfv .tape-grid{ grid-template-columns:repeat(10, 1fr); } .bfv .header{ align-items:flex-start; } }
`;

function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('bfv-styles')) return;
  const style = document.createElement('style');
  style.id = 'bfv-styles';
  style.textContent = CSS;
  document.head.appendChild(style);

  if (!document.getElementById('bfv-fonts')) {
    const link = document.createElement('link');
    link.id = 'bfv-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }
}

/* ============ brainfuck core ============ */

const TAPE_SIZE = 128;
const MAX_STEPS = 300000;
const TICK_MS = 40;
const SPEED_LEVELS = [1, 4, 16, 64];

const BF_CHARS = new Set(['>', '<', '+', '-', '.', ',', '[', ']']);
const CATEGORY = {
  '>': 'move', '<': 'move',
  '+': 'value', '-': 'value',
  '.': 'io', ',': 'io',
  '[': 'loop', ']': 'loop',
};

function buildJumpTable(prog) {
  const map = {};
  const stack = [];
  for (let i = 0; i < prog.length; i++) {
    if (prog[i] === '[') stack.push(i);
    else if (prog[i] === ']') {
      const open = stack.pop();
      if (open === undefined) throw new Error(`unmatched ']' at instruction ${i}`);
      map[open] = i;
      map[i] = open;
    }
  }
  if (stack.length) throw new Error(`unmatched '[' at instruction ${stack[stack.length - 1]}`);
  return map;
}

function makeState(programText, inputText) {
  const prog = programText.split('').filter((c) => BF_CHARS.has(c));
  try {
    const jump = buildJumpTable(prog);
    return {
      error: null,
      state: {
        prog, jump,
        tape: new Uint8Array(TAPE_SIZE),
        ptr: 0, ip: 0,
        input: inputText, inputPos: 0,
        output: [], steps: 0,
        halted: prog.length === 0,
      },
    };
  } catch (e) {
    return {
      error: e.message,
      state: {
        prog: [], jump: {}, tape: new Uint8Array(TAPE_SIZE),
        ptr: 0, ip: 0, input: '', inputPos: 0, output: [], steps: 0, halted: true,
      },
    };
  }
}

function stepOnce(s) {
  if (s.halted) return null;
  const instr = s.prog[s.ip];
  let flash = null;
  switch (instr) {
    case '>': s.ptr = (s.ptr + 1) % TAPE_SIZE; break;
    case '<': s.ptr = (s.ptr - 1 + TAPE_SIZE) % TAPE_SIZE; break;
    case '+': s.tape[s.ptr] = (s.tape[s.ptr] + 1) & 255; flash = { type: 'tape', index: s.ptr }; break;
    case '-': s.tape[s.ptr] = (s.tape[s.ptr] - 1) & 255; flash = { type: 'tape', index: s.ptr }; break;
    case '.': s.output.push(s.tape[s.ptr]); flash = { type: 'output', index: s.output.length - 1 }; break;
    case ',': {
      const ch = s.input[s.inputPos];
      s.tape[s.ptr] = ch !== undefined ? (ch.charCodeAt(0) & 255) : 0;
      if (ch !== undefined) { flash = { type: 'input', index: s.inputPos }; s.inputPos++; }
      break;
    }
    case '[': if (s.tape[s.ptr] === 0) s.ip = s.jump[s.ip]; break;
    case ']': if (s.tape[s.ptr] !== 0) s.ip = s.jump[s.ip]; break;
  }
  s.ip++;
  s.steps++;
  if (s.ip >= s.prog.length || s.steps >= MAX_STEPS) s.halted = true;
  return flash;
}

function byteToDisplay(byte) {
  if (byte === 32) return '·';
  if (byte === 10) return '↵';
  if (byte > 32 && byte < 127) return String.fromCharCode(byte);
  return '¤';
}

/* ============ interpreter hook ============ */

function useInterpreter(initialProgram, initialInput) {
  const initRef = useRef(null);
  if (initRef.current === null) initRef.current = makeState(initialProgram, initialInput);

  const stateRef = useRef(initRef.current.state);
  const intervalRef = useRef(null);
  const speedRef = useRef(SPEED_LEVELS[1]);

  const [, bump] = useState(0);
  const forceTick = () => bump((t) => t + 1);

  const [compileError, setCompileError] = useState(initRef.current.error);
  const [status, setStatus] = useState(
    initRef.current.error ? 'error' : (initRef.current.state.halted ? 'halted' : 'idle')
  );
  const [lastFlash, setLastFlash] = useState(null);
  const [speedIdx, setSpeedIdx] = useState(1);

  const clearTimer = () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };

  const compile = useCallback((programText, inputText) => {
    clearTimer();
    const { state, error } = makeState(programText, inputText);
    stateRef.current = state;
    setCompileError(error);
    setStatus(error ? 'error' : (state.halted ? 'halted' : 'idle'));
    setLastFlash(null);
    forceTick();
  }, []);

  const play = useCallback(() => {
    const s = stateRef.current;
    if (!s || s.halted || compileError) return;
    setStatus('running');
    intervalRef.current = setInterval(() => {
      const cur = stateRef.current;
      if (!cur) return;
      let flash = null;
      for (let i = 0; i < speedRef.current && !cur.halted; i++) {
        const f = stepOnce(cur);
        if (f) flash = f;
      }
      if (flash) setLastFlash(flash);
      forceTick();
      if (cur.halted) { clearTimer(); setStatus('halted'); }
    }, TICK_MS);
  }, [compileError]);

  const pause = useCallback(() => {
    clearTimer();
    setStatus('paused');
  }, []);

  const cycleSpeed = useCallback(() => {
    setSpeedIdx((i) => {
      const next = (i + 1) % SPEED_LEVELS.length;
      speedRef.current = SPEED_LEVELS[next];
      return next;
    });
  }, []);

  useEffect(() => () => clearTimer(), []);

  return {
    get: () => stateRef.current,
    status, compileError, lastFlash,
    speed: SPEED_LEVELS[speedIdx],
    compile, play, pause, cycleSpeed,
  };
}

/* ============ presets ============ */

const PRESETS = {
  hello: {
    label: 'Hello, World!',
    program: '++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.',
    input: '',
  },
  echo: {
    label: 'Echo input (cat)',
    program: ',[.,]',
    input: 'Brainfuck!',
  },
};

/* ============ UI pieces ============ */

function StatusDot({ status }) {
  return html`<span class="status-dot ${status === 'running' ? 'running' : ''} ${status === 'halted' ? 'halted' : ''} ${status === 'error' ? 'error' : ''}"></span>`;
}

function ProgramPanel({ prog, ip, status }) {
  return html`
    <div class="panel">
      <div class="panel-label">
        <span>program — one cell per instruction</span>
        <span class="count">${prog.length} instr</span>
      </div>
      ${prog.length === 0
        ? html`<div class="empty-note">no valid instructions — type some brainfuck above</div>`
        : html`
          <div class="prog-grid">
            ${prog.map((c, i) => {
              const cat = CATEGORY[c];
              const isCurrent = i === ip && (status === 'running' || status === 'paused');
              const isPast = i < ip;
              return html`
                <div
                  key=${i}
                  class="cell prog-cell cat-${cat} ${isPast ? 'past' : ''} ${isCurrent ? 'current' : ''}"
                  title=${`instruction ${i}: '${c}'`}
                >${c}</div>
              `;
            })}
          </div>
        `}
    </div>
  `;
}

function TapePanel({ tape, ptr, flash }) {
  return html`
    <div class="panel">
      <div class="panel-label">
        <span>memory tape — ${TAPE_SIZE} cells, one pixel per byte</span>
        <span class="count">ptr ${ptr}</span>
      </div>
      <div class="tape-grid">
        ${Array.from(tape).map((v, i) => {
          const isPtr = i === ptr;
          const isFlash = flash && flash.type === 'tape' && flash.index === i;
          return html`
            <div
              key=${i}
              class="cell tape-cell ${v !== 0 ? 'nonzero' : ''} ${isPtr ? 'ptr' : ''} ${isFlash ? 'flash' : ''}"
              title=${`cell ${i} = ${v}`}
            >${v !== 0 ? v : ''}</div>
          `;
        })}
      </div>
    </div>
  `;
}

function InputPanel({ input, inputPos, flash }) {
  return html`
    <div class="panel">
      <div class="panel-label">
        <span>input stream — one cell per byte consumed by ','</span>
        <span class="count">${Math.min(inputPos, input.length)}/${input.length} read</span>
      </div>
      ${input.length === 0
        ? html`<div class="empty-note">no input provided — this program doesn't need any</div>`
        : html`
          <div class="io-grid">
            ${input.split('').map((ch, i) => {
              const consumed = i < inputPos;
              const isCurrent = i === inputPos;
              const isFlash = flash && flash.type === 'input' && flash.index === i;
              return html`
                <div
                  key=${i}
                  class="cell io-cell ${consumed ? 'consumed' : ''} ${isCurrent ? 'current' : ''} ${isFlash ? 'flash' : ''}"
                  title=${`byte ${i}: '${ch}'`}
                >${byteToDisplay(ch.charCodeAt(0) & 255)}</div>
              `;
            })}
          </div>
        `}
    </div>
  `;
}

function OutputPanel({ output, flash }) {
  const text = output.map((b) => String.fromCharCode(b)).join('');
  return html`
    <div class="panel">
      <div class="panel-label">
        <span>output stream — one cell per byte written by '.'</span>
        <span class="count">${output.length} bytes</span>
      </div>
      ${output.length === 0
        ? html`<div class="empty-note">nothing written yet</div>`
        : html`
          <div class="io-grid">
            ${output.map((b, i) => {
              const isFlash = flash && flash.type === 'output' && flash.index === i;
              return html`
                <div key=${i} class="cell io-cell written ${isFlash ? 'flash' : ''}" title=${`byte ${i}: code ${b}`}>
                  ${byteToDisplay(b)}
                </div>
              `;
            })}
          </div>
        `}
      <div class="panel-label" style="margin-top:12px; margin-bottom:4px;"><span>result</span></div>
      <div class="result-box">${text}</div>
    </div>
  `;
}

function Legend() {
  const items = [
    ['var(--bfv-move)', 'pointer  <  >'],
    ['var(--bfv-value)', 'value  +  -'],
    ['var(--bfv-io)', 'io  .  ,'],
    ['var(--bfv-loop)', 'loop  [  ]'],
    ['var(--bfv-accent)', 'current / active'],
  ];
  return html`
    <div class="legend">
      ${items.map(([color, label]) => html`
        <div class="legend-item" key=${label}>
          <span class="swatch" style=${`background:${color}`}></span>
          <span>${label}</span>
        </div>
      `)}
    </div>
  `;
}

function Stats({ s, status }) {
  const stats = [
    ['steps', s.steps],
    ['ip', s.prog.length ? `${Math.min(s.ip, s.prog.length)}/${s.prog.length}` : '—'],
    ['pointer', s.ptr],
    ['output', s.output.length],
    ['input', s.input.length ? `${Math.min(s.inputPos, s.input.length)}/${s.input.length}` : '—'],
    ['status', status],
  ];
  return html`
    <div class="stats">
      ${stats.map(([label, value]) => html`
        <div class="stat" key=${label}>
          <div class="label">${label}</div>
          <div class="value">${value}</div>
        </div>
      `)}
    </div>
  `;
}

/* ============ main component (default export) ============ */

export function BrainfuckVisualizer(props) {
  injectStyles();

  const initialPresetKey = (props && props.initialPreset) || 'hello';
  const initialPreset = PRESETS[initialPresetKey] || PRESETS.hello;

  const [presetKey, setPresetKey] = useState(initialPresetKey);
  const [programText, setProgramText] = useState(initialPreset.program);
  const [inputText, setInputText] = useState(initialPreset.input);
  const [appliedSignature, setAppliedSignature] = useState(`${initialPreset.program}|${initialPreset.input}`);

  const interp = useInterpreter(initialPreset.program, initialPreset.input);
  const s = interp.get();

  const currentSignature = `${programText}|${inputText}`;
  const pendingChanges = currentSignature !== appliedSignature;

  const handlePreset = (key) => {
    const p = PRESETS[key];
    setPresetKey(key);
    setProgramText(p.program);
    setInputText(p.input);
    setAppliedSignature(`${p.program}|${p.input}`);
    interp.compile(p.program, p.input);
  };

  const handleReset = () => {
    setAppliedSignature(currentSignature);
    interp.compile(programText, inputText);
  };

  const handleRunToggle = () => {
    if (interp.status === 'running') interp.pause();
    else interp.play();
  };

  const runDisabled = interp.status === 'halted' || interp.status === 'error' || !s || s.prog.length === 0;

  return html`
    <div class="bfv">
      <div class="header">
        <div class="title-block">
          <span class="title">bf — tape machine</span>
          <span class="status">
            <${StatusDot} status=${interp.status} />
            ${interp.status}
          </span>
        </div>
        <div class="controls">
          <button class="btn btn-speed" onClick=${interp.cycleSpeed} title="cycle execution speed">${interp.speed}×</button>
          <button class="btn btn-run" onClick=${handleRunToggle} disabled=${runDisabled}>
            ${interp.status === 'running' ? '❚❚ pause' : '▸ run'}
          </button>
          <button class="btn" onClick=${handleReset}>reset</button>
        </div>
      </div>

      <div class="config">
        <div class="config-row">
          <div class="field" style="flex-basis:100%;">
            <label>preset</label>
            <select value=${presetKey} onChange=${(e) => handlePreset(e.target.value)}>
              ${Object.entries(PRESETS).map(([key, p]) => html`<option key=${key} value=${key}>${p.label}</option>`)}
            </select>
          </div>
        </div>
        <div class="config-row">
          <div class="field">
            <label>program</label>
            <textarea
              rows="3"
              spellcheck="false"
              value=${programText}
              onInput=${(e) => setProgramText(e.target.value)}
            ></textarea>
          </div>
          <div class="field">
            <label>input</label>
            <textarea
              rows="3"
              spellcheck="false"
              value=${inputText}
              onInput=${(e) => setInputText(e.target.value)}
            ></textarea>
          </div>
        </div>
        ${interp.compileError
          ? html`<div class="config-row"><div class="error-hint">compile error: ${interp.compileError}</div></div>`
          : pendingChanges
            ? html`<div class="config-row"><div class="hint">edited — press reset to load these changes</div></div>`
            : null}
      </div>

      <${ProgramPanel} prog=${s.prog} ip=${s.ip} status=${interp.status} />
      <${TapePanel} tape=${s.tape} ptr=${s.ptr} flash=${interp.lastFlash} />
      <${InputPanel} input=${s.input} inputPos=${s.inputPos} flash=${interp.lastFlash} />
      <${OutputPanel} output=${s.output} flash=${interp.lastFlash} />

      <div class="panel">
        <${Legend} />
        <${Stats} s=${s} status=${interp.status} />
      </div>
    </div>
  `;
}

export default BrainfuckVisualizer;

/* ============ optional auto-mount ============ */
// If the page has an element with id="app" or [data-brainfuck-visualizer],
// mount automatically so this file can be dropped in and used as-is.
if (typeof document !== 'undefined') {
  const mountEl = document.querySelector('[data-brainfuck-visualizer]') || document.getElementById('brainfuck-visualizer');
  if (mountEl) {
    render(html`<${BrainfuckVisualizer} />`, mountEl);
  }
}
