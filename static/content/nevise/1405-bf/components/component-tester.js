// component-tester.js
// htm + Preact component that runs four kinds of tests against the two
// libraries (and, for e2e, against the actual BFRunner component):
//   - unit:        individual functions in isolation
//   - integration: full programs run end-to-end through each engine
//   - property:    randomized, seeded programs checked for interpreter/JIT
//                   equivalence and other invariants
//   - e2e:         BFRunner mounted into a hidden DOM node, driven the way
//                   a person would (typing, clicking), asserting on the
//                   rendered output
//
// This file owns its own tiny test harness (test/assert/runSuite) — no
// external test framework is loaded, to keep the deliverable to exactly
// two library files and two component files.

import { h, render } from 'preact';
import { useState, useCallback } from 'preact/hooks';
import htmModule from 'htm';
import { parseBrainfuck, compileInterpreter, runBrainfuck } from '../libs/lib-bf-interpreter.js';
import { compileToWasmBytes, compileJit, runBrainfuckJit } from '../libs/lib-bf-jit.js';
import { BFRunner, SAMPLE_PROGRAMS, makeHeavyLoopProgram } from 'component-runner';

const html = htmModule.bind(h);

// ---------------------------------------------------------------------
// Tiny test harness
// ---------------------------------------------------------------------

function test(name, fn) {
  return { name, fn };
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function runSuite(tests) {
  const results = [];
  for (const t of tests) {
    const t0 = performance.now();
    try {
      await t.fn();
      results.push({ name: t.name, pass: true, ms: performance.now() - t0 });
    } catch (e) {
      results.push({ name: t.name, pass: false, ms: performance.now() - t0, error: e && e.message ? e.message : String(e) });
    }
  }
  return results;
}

// ---------------------------------------------------------------------
// Small seeded PRNG + random (always-terminating) Brainfuck generator,
// for the property-based tests. Loops are generated as
//   '+'*k '[' <straight-line body with no pointer moves> '-' ']'
// which is guaranteed to run exactly k times and always halts.
// ---------------------------------------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBrainfuckProgram(rng, segments = 6) {
  let out = '';
  for (let s = 0; s < segments; s++) {
    const kind = rng();
    if (kind < 0.55) {
      // straight-line run of pointer/cell ops and prints
      const ops = ['>', '<', '+', '-', '.'];
      const len = 1 + Math.floor(rng() * 5);
      for (let i = 0; i < len; i++) out += ops[Math.floor(rng() * ops.length)];
    } else {
      // a loop guaranteed to run exactly k times and always terminate:
      // set the counter, then only ever touch it (or print) inside the loop
      const k = 1 + Math.floor(rng() * 6);
      const printInside = rng() < 0.5 ? '.' : '';
      out += '+'.repeat(k) + '[' + printInside + '-]';
    }
  }
  return out;
}

// ---------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------

function unitTests() {
  return [
    test('parseBrainfuck strips non-instruction characters', () => {
      const { program } = parseBrainfuck('he+llo>world<!');
      assertEqual(program.join(''), '+><');
    }),
    test('parseBrainfuck matches nested brackets both directions', () => {
      const { program, jumps } = parseBrainfuck('+[-[+]-]');
      const openA = program.indexOf('['); // outer
      const closeA = program.lastIndexOf(']'); // outer
      assertEqual(jumps[openA], closeA);
      assertEqual(jumps[closeA], openA);
    }),
    test("parseBrainfuck throws SyntaxError on unmatched '['", () => {
      let threw = false;
      try {
        parseBrainfuck('[+');
      } catch (e) {
        threw = e instanceof SyntaxError;
      }
      assert(threw, "expected a SyntaxError for unmatched '['");
    }),
    test("parseBrainfuck throws SyntaxError on unmatched ']'", () => {
      let threw = false;
      try {
        parseBrainfuck('+]');
      } catch (e) {
        threw = e instanceof SyntaxError;
      }
      assert(threw, "expected a SyntaxError for unmatched ']'");
    }),
    test('interpreter: cell value wraps 255 -> 0 on increment', () => {
      const out = runBrainfuck('+'.repeat(256) + '.').output;
      assertEqual(out.charCodeAt(0), 0);
    }),
    test('interpreter: cell value wraps 0 -> 255 on decrement', () => {
      const out = runBrainfuck('-.').output;
      assertEqual(out.charCodeAt(0), 255);
    }),
    test('interpreter: tape pointer wraps at the tape boundary', () => {
      // moving left from cell 0 should land on the last cell, not throw
      const out = runBrainfuck('<.').output;
      assertEqual(out.charCodeAt(0), 0);
    }),
    test('interpreter: loop body is skipped when the cell is already zero', () => {
      const out = runBrainfuck('[+++++++++.]').output;
      assertEqual(out, '');
    }),
    test('compileToWasmBytes produces a well-formed WASM header', () => {
      const bytes = compileToWasmBytes('+.');
      assertEqual(bytes[0], 0x00);
      assertEqual(bytes[1], 0x61); // 'a'
      assertEqual(bytes[2], 0x73); // 's'
      assertEqual(bytes[3], 0x6d); // 'm'
      assertEqual(bytes[4], 0x01); // version 1
    }),
    test("compileToWasmBytes throws SyntaxError on unmatched brackets", () => {
      let threw = false;
      try {
        compileToWasmBytes('[[+]');
      } catch (e) {
        threw = e instanceof SyntaxError;
      }
      assert(threw, 'expected a SyntaxError');
    }),
    test('compileToWasmBytes output is a real, WebAssembly.validate-able module', () => {
      const bytes = compileToWasmBytes(SAMPLE_PROGRAMS['Hello World']);
      assert(WebAssembly.validate(bytes), 'generated bytes should pass WebAssembly.validate');
    }),
  ];
}

function integrationTests() {
  return [
    test('interpreter: Hello World program prints exactly "Hello World!\\n"', () => {
      const out = runBrainfuck(SAMPLE_PROGRAMS['Hello World']).output;
      assertEqual(out, 'Hello World!\n');
    }),
    test('JIT: Hello World program prints exactly "Hello World!\\n"', async () => {
      const out = (await runBrainfuckJit(SAMPLE_PROGRAMS['Hello World'])).output;
      assertEqual(out, 'Hello World!\n');
    }),
    test('interpreter and JIT agree on Hello World', async () => {
      const a = runBrainfuck(SAMPLE_PROGRAMS['Hello World']).output;
      const b = (await runBrainfuckJit(SAMPLE_PROGRAMS['Hello World'])).output;
      assertEqual(a, b);
    }),
    test('interpreter: cat program echoes the input verbatim', () => {
      const out = runBrainfuck(',[.,]', 'round-trip me!').output;
      assertEqual(out, 'round-trip me!');
    }),
    test('JIT: cat program echoes the input verbatim', async () => {
      const out = (await runBrainfuckJit(',[.,]', 'round-trip me!')).output;
      assertEqual(out, 'round-trip me!');
    }),
    test('interpreter and JIT agree on the heavy-loop benchmark program', async () => {
      const program = SAMPLE_PROGRAMS['Heavy loop (~1M ops, benchmark)'];
      const a = runBrainfuck(program).output;
      const b = (await runBrainfuckJit(program)).output;
      assertEqual(a, b);
      assert(a.length === 1, 'heavy loop program should print exactly one character');
    }),
    test('a compiled interpreter instance can be run multiple times independently', () => {
      const engine = compileInterpreter(',.,.');
      const first = engine.run('AB').output;
      const second = engine.run('ZZ').output;
      assertEqual(first, 'AB');
      assertEqual(second, 'ZZ');
    }),
    test('a compiled JIT instance can be run multiple times independently', async () => {
      const jit = await compileJit(',.,.');
      const first = (await jit.run('AB')).output;
      const second = (await jit.run('ZZ')).output;
      assertEqual(first, 'AB');
      assertEqual(second, 'ZZ');
    }),
  ];
}

function propertyTests() {
  const SEED = 1234;
  const CASES = 25;
  return [
    test(`interpreter/JIT output equivalence over ${CASES} random programs (seed ${SEED})`, async () => {
      const rng = mulberry32(SEED);
      for (let i = 0; i < CASES; i++) {
        const program = randomBrainfuckProgram(rng);
        const interp = runBrainfuck(program).output;
        const jit = (await runBrainfuckJit(program)).output;
        assertEqual(jit, interp, `mismatch on case ${i} for program ${JSON.stringify(program)}`);
      }
    }),
    test('property: a program with no "." produces no output, on both engines', async () => {
      const rng = mulberry32(99);
      for (let i = 0; i < 10; i++) {
        const program = randomBrainfuckProgram(rng).replace(/\./g, '');
        const interp = runBrainfuck(program).output;
        const jit = (await runBrainfuckJit(program)).output;
        assertEqual(interp, '', 'interpreter should produce no output');
        assertEqual(jit, '', 'JIT should produce no output');
      }
    }),
    test('property: both engines are deterministic (same input, same output, twice)', async () => {
      const rng = mulberry32(555);
      for (let i = 0; i < 8; i++) {
        const program = randomBrainfuckProgram(rng);
        const interpFirst = runBrainfuck(program).output;
        const interpSecond = runBrainfuck(program).output;
        assertEqual(interpFirst, interpSecond, 'interpreter should be deterministic');
        const jitFirst = (await runBrainfuckJit(program)).output;
        const jitSecond = (await runBrainfuckJit(program)).output;
        assertEqual(jitFirst, jitSecond, 'JIT should be deterministic');
      }
    }),
    test('property: generated programs always halt within a bounded step count', () => {
      // guards against a generator regression that could emit a non-terminating loop
      const rng = mulberry32(777);
      for (let i = 0; i < 10; i++) {
        const program = randomBrainfuckProgram(rng, 10);
        const { steps } = compileInterpreter(program).run('');
        assert(steps < 100000, `program took ${steps} steps, generator may have produced an unbounded loop`);
      }
    }),
  ];
}

function e2eTests() {
  return [
    test('e2e: default Hello World program runs via the UI and outputs match', async () => {
      const { container, cleanup } = mountRunner();
      try {
        await nextTick();
        clickTestId(container, 'run-button');
        await waitFor(() => container.querySelector('[data-testid="results"]'), 8000);
        const matchText = container.querySelector('[data-testid="match"]').textContent;
        assert(matchText.includes('match') && !matchText.includes('DO NOT MATCH'), 'expected interpreter/JIT outputs to match');
        const interpOut = container.querySelector('[data-testid="interpreter-output"]').textContent;
        assertEqual(interpOut, 'Hello World!\n');
      } finally {
        cleanup();
      }
    }),
    test('e2e: editing the program and input text areas drives a matching cat-program run', async () => {
      const { container, cleanup } = mountRunner();
      try {
        await nextTick();
        setValueAndFire(container.querySelector('[data-testid="program-textarea"]'), ',[.,]');
        setValueAndFire(container.querySelector('[data-testid="input-textarea"]'), 'typed by e2e test');
        await nextTick();
        clickTestId(container, 'run-button');
        await waitFor(() => container.querySelector('[data-testid="results"]'), 8000);
        const interpOut = container.querySelector('[data-testid="interpreter-output"]').textContent;
        const jitOut = container.querySelector('[data-testid="jit-output"]').textContent;
        assertEqual(interpOut, 'typed by e2e test');
        assertEqual(jitOut, 'typed by e2e test');
      } finally {
        cleanup();
      }
    }),
    test('e2e: switching the sample-program dropdown updates the program editor', async () => {
      const { container, cleanup } = mountRunner();
      try {
        await nextTick();
        const select = container.querySelector('[data-testid="sample-select"]');
        select.value = 'Cat (echoes Input box)';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        await nextTick();
        const programArea = container.querySelector('[data-testid="program-textarea"]');
        assertEqual(programArea.value, SAMPLE_PROGRAMS['Cat (echoes Input box)']);
      } finally {
        cleanup();
      }
    }),
    test('e2e: the run button is disabled while a benchmark is in flight', async () => {
      const { container, cleanup } = mountRunner();
      try {
        await nextTick();
        setValueAndFire(
          container.querySelector('[data-testid="program-textarea"]'),
          makeHeavyLoopProgram(120, 2000, 65)
        );
        await nextTick();
        const button = container.querySelector('[data-testid="run-button"]');
        button.click();
        // Immediately after clicking, Preact re-renders synchronously enough
        // that the disabled attribute should already reflect "running".
        await nextTick();
        assert(button.disabled, 'run button should be disabled while running');
        await waitFor(() => container.querySelector('[data-testid="results"]'), 8000);
        assert(!button.disabled, 'run button should be re-enabled once finished');
      } finally {
        cleanup();
      }
    }),
  ];
}

// ---------------------------------------------------------------------
// e2e helpers: mount the real BFRunner component off-screen and drive it
// like a person would.
// ---------------------------------------------------------------------

function mountRunner() {
  const container = document.createElement('div');
  container.setAttribute('data-e2e-sandbox', 'true');
  container.style.position = 'absolute';
  container.style.left = '-99999px';
  container.style.top = '0';
  document.body.appendChild(container);
  render(h(BFRunner), container);
  return {
    container,
    cleanup() {
      render(null, container);
      container.remove();
    },
  };
}

function clickTestId(container, testId) {
  const el = container.querySelector(`[data-testid="${testId}"]`);
  if (!el) throw new Error(`could not find [data-testid="${testId}"]`);
  el.click();
}

function setValueAndFire(el, value) {
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function nextTick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function waitFor(predicate, timeoutMs) {
  const start = performance.now();
  return new Promise((resolve, reject) => {
    (function poll() {
      const value = predicate();
      if (value) return resolve(value);
      if (performance.now() - start > timeoutMs) return reject(new Error('waitFor timed out'));
      setTimeout(poll, 25);
    })();
  });
}

// ---------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------

const SUITES = [
  { key: 'unit', label: 'آزمایش های واحد', build: unitTests },
  { key: 'integration', label: 'آزمایش های یکپارچگی', build: integrationTests },
  { key: 'property', label: 'آزمایش های فرضیات', build: propertyTests },
  { key: 'e2e', label: 'آزمایش های مبدا به مقصد', build: e2eTests },
];

function summarize(results) {
  const passed = results.filter((r) => r.pass).length;
  const totalMs = results.reduce((a, r) => a + r.ms, 0);
  return { passed, total: results.length, totalMs };
}

export function BFTester() {
  const [resultsByKey, setResultsByKey] = useState({});
  const [runningKey, setRunningKey] = useState(null);

  const runOne = useCallback(async (key) => {
    const suite = SUITES.find((s) => s.key === key);
    setRunningKey(key);
    try {
      const results = await runSuite(suite.build());
      setResultsByKey((prev) => ({ ...prev, [key]: results }));
    } finally {
      setRunningKey(null);
    }
  }, []);

  const runAll = useCallback(async () => {
    setRunningKey('all');
    try {
      const next = {};
      for (const suite of SUITES) {
        next[suite.key] = await runSuite(suite.build());
        setResultsByKey((prev) => ({ ...prev, ...next }));
      }
    } finally {
      setRunningKey(null);
    }
  }, []);

  return html`
    <section class="panel" data-testid="bf-tester">
      <h2 class="rtl">جعبه آزمایش</h2>
      <p class="rtl">
        آزمایش واحد (Unit) ، آزمایش یکپارچگی (integration) ، آزمایش فرضیات (property) ، آزمایش مبدا به مقصد (end-to-end) برای ترجمار و همگردار ، 
        قابل اجرا داخل مرورگر بدون نیاز به اجراکننده آزمایش جداگانه.
      </p>

      <div class="test-buttons">
        ${SUITES.map(
          (suite) => html`
            <button
              class="btn"
              data-testid=${`run-${suite.key}`}
              onClick=${() => runOne(suite.key)}
              disabled=${runningKey !== null}
            >
              ${runningKey === suite.key ? `در حال اجرای ${suite.label}...` : `اجرای ${suite.label}`}
            </button>
          `
        )}
        <button
          class="btn btn-primary"
          data-testid="run-all"
          onClick=${runAll}
          disabled=${runningKey !== null}
        >
          ${runningKey === 'all' ? 'در حال اجرای همه آزمایش ها...' : 'اجرای همه آزمایش ها'}
        </button>
      </div>

      <div class="test-suites">
        ${SUITES.map((suite) => {
          const results = resultsByKey[suite.key];
          const summary = results ? summarize(results) : null;
          return html`
            <div class="test-suite" data-testid=${`suite-${suite.key}`}>
              <h3 class="rtl">
                ${suite.label}
                ${summary &&
                html`
                  <span class=${`suite-summary ${summary.passed === summary.total ? 'موفق' : 'ناموفق'}`}>
                    ${summary.passed}/${summary.total} passed · ${summary.totalMs.toFixed(1)} ms
                  </span>
                `}
              </h3>
              ${results
                ? html`
                    <ul class="test-list">
                      ${results.map(
                        (r) => html`
                          <li class=${r.pass ? 'آزمایش-موفق' : 'آزمایش-ناموفق'}>
                            <span class="test-mark">${r.pass ? '✓' : '✗'}</span>
                            <span class="test-name">${r.name}</span>
                            <span class="test-ms">${r.ms.toFixed(2)} ms</span>
                            ${!r.pass && html`<div class="test-error">${r.error}</div>`}
                          </li>
                        `
                      )}
                    </ul>
                  `
                : html`<p class="muted rtl">آزمایشی انجام نگرفته است.</p>`}
            </div>
          `;
        })}
      </div>
    </section>
  `;
}
