// component-runner.js
// htm + Preact component that lets a person edit (or pick a sample)
// Brainfuck program and input, then run it through both engines from
// lib-bf-interpreter.js and lib-bf-jit.js, 10 times each, and see the
// averaged timing.

import { h } from 'preact';
import { useState, useCallback } from 'preact/hooks';
import htmModule from 'htm';
import { compileInterpreter } from '../libs/lib-bf-interpreter.js';
import { compileJit } from '../libs/lib-bf-jit.js';

const html = htmModule.bind(h);
const RUNS = 10;

/** Builds a Brainfuck program that does ~outerCount*innerCount busywork,
 * then prints a single deterministic character — enough real work to make
 * the interpreter-vs-JIT gap visible without hanging the tab. */
export function makeHeavyLoopProgram(outerCount = 150, innerCount = 3000, finalCharCode = 64) {
  return '+'.repeat(outerCount) + '[' + '>' + '+'.repeat(innerCount) + '[-]' + '<-]' + '>>' + '+'.repeat(finalCharCode) + '.';
}

export const SAMPLE_PROGRAMS = {
  'Hello World': '++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.',
  'Cat (echoes Input box)': ',[.,]',
  'Heavy loop (~1M ops, benchmark)': makeHeavyLoopProgram(),
};

export const SAMPLE_INPUTS = {
  '(empty)': '',
  'Hello, Claude!': 'Hello, Claude!',
  'The quick brown fox': 'The quick brown fox',
};

const DEFAULT_PROGRAM_NAME = 'Hello World';
const DEFAULT_INPUT_NAME = '(empty)';

function average(nums) {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function BFRunner() {
  const [programName, setProgramName] = useState(DEFAULT_PROGRAM_NAME);
  const [inputName, setInputName] = useState(DEFAULT_INPUT_NAME);
  const [program, setProgram] = useState(SAMPLE_PROGRAMS[DEFAULT_PROGRAM_NAME]);
  const [input, setInput] = useState(SAMPLE_INPUTS[DEFAULT_INPUT_NAME]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const onProgramSample = useCallback((e) => {
    const name = e.target.value;
    setProgramName(name);
    if (SAMPLE_PROGRAMS[name] !== undefined) setProgram(SAMPLE_PROGRAMS[name]);
  }, []);

  const onInputSample = useCallback((e) => {
    const name = e.target.value;
    setInputName(name);
    if (SAMPLE_INPUTS[name] !== undefined) setInput(SAMPLE_INPUTS[name]);
  }, []);

  const runBenchmark = useCallback(async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      // --- interpreter: parse once, execute RUNS times ---
      const interpreter = compileInterpreter(program);
      const interpreterTimes = [];
      let interpreterOutput = '';
      for (let i = 0; i < RUNS; i++) {
        const t0 = performance.now();
        const r = interpreter.run(input);
        interpreterTimes.push(performance.now() - t0);
        interpreterOutput = r.output;
      }

      // --- JIT: compile to wasm once, execute RUNS times ---
      const jit = await compileJit(program);
      const jitTimes = [];
      let jitOutput = '';
      for (let i = 0; i < RUNS; i++) {
        const t0 = performance.now();
        const r = await jit.run(input);
        jitTimes.push(performance.now() - t0);
        jitOutput = r.output;
      }

      const interpreterAvg = average(interpreterTimes);
      const jitAvg = average(jitTimes);

      setResult({
        interpreter: {
          avg: interpreterAvg,
          min: Math.min(...interpreterTimes),
          max: Math.max(...interpreterTimes),
          output: interpreterOutput,
        },
        jit: {
          avg: jitAvg,
          min: Math.min(...jitTimes),
          max: Math.max(...jitTimes),
          output: jitOutput,
          compileTimeMs: jit.compileTimeMs,
          wasmByteLength: jit.wasmByteLength,
        },
        match: interpreterOutput === jitOutput,
        speedup: interpreterAvg / jitAvg,
        runs: RUNS,
      });
    } catch (e) {
      setError(e && e.message ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }, [program, input]);

  return html`
    <section class="panel" data-testid="bf-runner">
      <h2>Run &amp; benchmark</h2>
      <p class="lede">
        Pick a sample or write your own Brainfuck program, then run it through the
        interpreter and the WASM JIT ${RUNS} times each to compare their speed.
      </p>

      <div class="field-row">
        <label class="field">
          Sample program
          <select data-testid="sample-select" value=${programName} onChange=${onProgramSample}>
            ${Object.keys(SAMPLE_PROGRAMS).map(
              (name) => html`<option value=${name}>${name}</option>`
            )}
            <option value="__custom__">Custom / edited</option>
          </select>
        </label>
        <label class="field">
          Sample input
          <select data-testid="input-select" value=${inputName} onChange=${onInputSample}>
            ${Object.keys(SAMPLE_INPUTS).map(
              (name) => html`<option value=${name}>${name}</option>`
            )}
          </select>
        </label>
      </div>

      <div class="editor-grid">
        <div class="editor">
          <label for="bf-program">Program</label>
          <textarea
            id="bf-program"
            data-testid="program-textarea"
            rows="7"
            spellcheck="false"
            value=${program}
            onInput=${(e) => {
              setProgram(e.target.value);
              setProgramName('__custom__');
            }}
          ></textarea>
        </div>
        <div class="editor">
          <label for="bf-input">Input (read by <code>,</code>)</label>
          <textarea
            id="bf-input"
            data-testid="input-textarea"
            rows="7"
            spellcheck="false"
            value=${input}
            onInput=${(e) => {
              setInput(e.target.value);
              setInputName('__custom__');
            }}
          ></textarea>
        </div>
      </div>

      <button
        class="btn btn-primary"
        data-testid="run-button"
        onClick=${runBenchmark}
        disabled=${running}
      >
        ${running ? `Running (${RUNS}x each)…` : `Run benchmark (${RUNS}x each)`}
      </button>

      ${error && html`<p class="banner banner-fail" data-testid="error">${error}</p>`}

      ${result &&
      html`
        <div class="results" data-testid="results">
          <div class="result-col result-interpreter">
            <h3>Interpreter</h3>
            <dl>
              <dt>Average (${result.runs} runs)</dt>
              <dd class="metric" data-testid="interpreter-avg">${result.interpreter.avg.toFixed(3)} ms</dd>
              <dt>Min / max</dt>
              <dd>${result.interpreter.min.toFixed(3)} ms / ${result.interpreter.max.toFixed(3)} ms</dd>
            </dl>
            <label>Output</label>
            <pre data-testid="interpreter-output">${result.interpreter.output}</pre>
          </div>
          <div class="result-col result-jit">
            <h3>WASM JIT</h3>
            <dl>
              <dt>Compile (once, to x64)</dt>
              <dd>${result.jit.compileTimeMs.toFixed(3)} ms — ${result.jit.wasmByteLength} bytes of wasm</dd>
              <dt>Average run (${result.runs} runs)</dt>
              <dd class="metric" data-testid="jit-avg">${result.jit.avg.toFixed(3)} ms</dd>
              <dt>Min / max</dt>
              <dd>${result.jit.min.toFixed(3)} ms / ${result.jit.max.toFixed(3)} ms</dd>
            </dl>
            <label>Output</label>
            <pre data-testid="jit-output">${result.jit.output}</pre>
          </div>
        </div>
        <p
          class=${`banner ${result.match ? 'banner-ok' : 'banner-fail'}`}
          data-testid="match"
        >
          Outputs ${result.match ? 'match' : 'DO NOT MATCH'} — JIT ran
          ${result.speedup.toFixed(2)}x ${result.speedup >= 1 ? 'faster' : 'slower'} on average.
        </p>
      `}
    </section>
  `;
}
