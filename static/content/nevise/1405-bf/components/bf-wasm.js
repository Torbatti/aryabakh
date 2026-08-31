import { h, render } from 'preact';
import { useState, useRef } from 'preact/hooks';
import htm from 'htm';

const html = htm.bind(h);
/* Brainfuck -> WebAssembly compiler.
 * A genuine x64 JIT means: emit machine code, mark it executable, jump to it.
 * A browser sandbox can't do that directly. WebAssembly is the legitimate
 * path to the same destination: this hand-writes real .wasm bytecode, and
 * the instant WebAssembly.instantiate() runs it, V8 JIT-compiles that
 * bytecode straight to native x64 machine code - the same pipeline that
 * JITs your JS. BF's [ ] brackets are already properly nested, so they map
 * directly onto WebAssembly's block/loop control flow with no jump patching.
 */

function uleb128(value) {
    const bytes = [];
    do {
        let byte = value & 0x7f;
        value >>>= 7;
        if (value !== 0) byte |= 0x80;
        bytes.push(byte);
    } while (value !== 0);
    return bytes;
}

function sleb128(value) {
    value = value | 0;
    const bytes = [];
    let more = true;
    while (more) {
        let byte = value & 0x7f;
        value >>= 7;
        if ((value === 0 && (byte & 0x40) === 0) || (value === -1 && (byte & 0x40) !== 0)) {
            more = false;
        } else {
            byte |= 0x80;
        }
        bytes.push(byte);
    }
    return bytes;
}

function strBytes(s) {
    const enc = new TextEncoder().encode(s);
    return [...uleb128(enc.length), ...enc];
}

function section(id, contentBytes) {
    return [id, ...uleb128(contentBytes.length), ...contentBytes];
}

function vec(items) {
    return [...uleb128(items.length), ...items.flat()];
}

const OP = {
    block: 0x02, loop: 0x03, br: 0x0c, br_if: 0x0d, call: 0x10, end: 0x0b,
    local_get: 0x20, local_set: 0x21,
    i32_load8_u: 0x2d, i32_store8: 0x3a,
    i32_const: 0x41,
    i32_eqz: 0x45,
    i32_add: 0x6a, i32_sub: 0x6b, i32_and: 0x71,
};

const TAPE_MASK = 0xffff;

function compileBrainfuckToWasm(source) {
    const ops = [];
    const loopStack = [];
    let instrCount = 0;

    const memarg = () => [0x00, 0x00];
    const emit = (...bytes) => { ops.push(...bytes); };

    for (const ch of source) {
        switch (ch) {
            case '>':
                emit(OP.local_get, 0, OP.i32_const, ...sleb128(1), OP.i32_add,
                    OP.i32_const, ...sleb128(TAPE_MASK), OP.i32_and, OP.local_set, 0);
                instrCount++; break;
            case '<':
                emit(OP.local_get, 0, OP.i32_const, ...sleb128(1), OP.i32_sub,
                    OP.i32_const, ...sleb128(TAPE_MASK), OP.i32_and, OP.local_set, 0);
                instrCount++; break;
            case '+':
                emit(OP.local_get, 0, OP.local_get, 0, OP.i32_load8_u, ...memarg(),
                    OP.i32_const, ...sleb128(1), OP.i32_add, OP.i32_store8, ...memarg());
                instrCount++; break;
            case '-':
                emit(OP.local_get, 0, OP.local_get, 0, OP.i32_load8_u, ...memarg(),
                    OP.i32_const, ...sleb128(1), OP.i32_sub, OP.i32_store8, ...memarg());
                instrCount++; break;
            case '.':
                emit(OP.local_get, 0, OP.i32_load8_u, ...memarg(), OP.call, 0);
                instrCount++; break;
            case ',':
                emit(OP.local_get, 0, OP.call, 1, OP.i32_store8, ...memarg());
                instrCount++; break;
            case '[':
                emit(OP.block, 0x40, OP.loop, 0x40,
                    OP.local_get, 0, OP.i32_load8_u, ...memarg(), OP.i32_eqz, OP.br_if, 1);
                loopStack.push(true);
                instrCount++; break;
            case ']':
                if (!loopStack.length) throw new Error("unmatched ]");
                loopStack.pop();
                emit(OP.br, 0, OP.end, OP.end);
                instrCount++; break;
            default:
                break;
        }
    }
    if (loopStack.length) throw new Error("unmatched [");

    const typeSection = section(1, vec([
        [0x60, ...vec([0x7f]), ...vec([])],
        [0x60, ...vec([]), ...vec([0x7f])],
        [0x60, ...vec([]), ...vec([])],
    ]));

    const importSection = section(2, vec([
        [...strBytes('env'), ...strBytes('putchar'), 0x00, 0x00],
        [...strBytes('env'), ...strBytes('getchar'), 0x00, 0x01],
    ]));

    const functionSection = section(3, vec([[0x02]]));
    const memorySection = section(5, vec([[0x00, ...uleb128(1)]]));
    const exportSection = section(7, vec([
        [...strBytes('run'), 0x00, ...uleb128(2)],
        [...strBytes('memory'), 0x02, ...uleb128(0)],
    ]));

    const localDecls = vec([[...uleb128(1), 0x7f]]);
    const body = [...localDecls, ...ops, OP.end];
    const codeSection = section(10, vec([[...uleb128(body.length), ...body]]));

    const bytes = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
        ...typeSection, ...importSection, ...functionSection,
        ...memorySection, ...exportSection, ...codeSection,
    ]);

    return { bytes, instrCount };
}

async function runCompiled(bytes, stdin, onChar) {
    let pos = 0;
    const importObject = {
        env: {
            putchar: (c) => onChar(c),
            getchar: () => (pos < stdin.length ? stdin.charCodeAt(pos++) : 0),
        },
    };
    const t0 = performance.now();
    const { instance } = await WebAssembly.instantiate(bytes, importObject);
    const t1 = performance.now();
    instance.exports.run();
    const t2 = performance.now();
    return { jitMs: t1 - t0, execMs: t2 - t1 };
}

function toHex(bytes) {
    const rows = [];
    for (let i = 0; i < bytes.length; i += 16) {
        const chunk = bytes.slice(i, i + 16);
        const off = i.toString(16).padStart(6, '0');
        const hex = Array.from(chunk).map((b) => b.toString(16).padStart(2, '0')).join(' ');
        rows.push(off + '  ' + hex);
    }
    return rows.join('\n');
}

const EXAMPLES = {
    'hello world': '++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.',
    'echo stdin': ',[.,]',
    'shift char by one': ',+.',
    // 'add two digits': ',>,[<+>-]<.',
};

function App() {
    const [src, setSrc] = useState(EXAMPLES['hello world']);
    const [stdin, setStdin] = useState('');
    const [output, setOutput] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [running, setRunning] = useState(false);
    const [stats, setStats] = useState(null);
    const [wasmBytes, setWasmBytes] = useState(null);
    const outRef = useRef(null);

    const onRun = async () => {
        setRunning(true);
        setErrorMsg('');
        setOutput('');
        setStats(null);
        let chars = [];
        try {
            const tCompileStart = performance.now();
            const { bytes, instrCount } = compileBrainfuckToWasm(src);
            const compileMs = performance.now() - tCompileStart;
            setWasmBytes(bytes);

            const { jitMs, execMs } = await runCompiled(bytes, stdin, (c) => {
                chars.push(String.fromCharCode(c));
            });

            setOutput(chars.join(''));
            setStats({
                instrCount,
                byteLen: bytes.length,
                compileMs,
                jitMs,
                execMs,
            });
        } catch (e) {
            setErrorMsg(String(e.message || e));
            setOutput(chars.join(''));
        } finally {
            setRunning(false);
        }
    };

    return html`

    <div class="hdr">
        <h2 class="rtl">همگردار لحظه ای</h2>
        <span class="tag">bf code -> wasm -> native x64</span>
    </div>
    ${true ? html`` : html`
        <p class="sub">
        Compiles Brainfuck straight to hand-assembled <code>.wasm</code> bytecode, no toolchain.
        The moment it's instantiated, the engine JIT-compiles it to real x64 machine code and runs it —
        the same route your JS itself takes to become native code.
        </p>
    `}

    <div class="grid">
      <div class="panel">
        <div class="panel-hd">
            <p class="t">برنامه ها:</p>
          <div class="examples">
            ${Object.keys(EXAMPLES).map((name) => html`
              <button class="ghost" onClick=${() => setSrc(EXAMPLES[name])}>${name}</button>
            `)}
          </div>
        </div>
        <div class="panel-body">
          <textarea id="src" spellcheck="false"
            value=${src}
            onInput=${(e) => setSrc(e.target.value)}
          ></textarea>
        </div>
        
        <div class="panel-hd">
            <p class="t">ورودی:</p>
        </div>

       
        <div class="panel-body">
          <textarea id="stdin" spellcheck="false"
            value=${stdin}
            onInput=${(e) => setStdin(e.target.value)}
            placeholder="input characters, read one at a time by ','"
          ></textarea>
        </div>
        <div class="row">
          <button class="primary" disabled=${running} onClick=${onRun}>
            ${running ? 'در حال تولید و اجرا...' : 'تولید و اجرا'}
          </button>
          <span style="font-size:11.5px; color:var(--dim);">${src.length} حرف</span>
        </div>
      </div>

        <div class="panel">
            <div class="panel-hd"><span class="t">خروجی:</span></div>
            <div class="out ${errorMsg ? 'err' : ''}" ref=${outRef}>${errorMsg ? ('compile error: ' + errorMsg) : (output || html`<span>run the program to see output here</span>`)}</div>
        </div>

        <div class="panel">
            <div class="panel-hd"><span class="t">اطلاعات همگردار لحظه ای:</span></div>
            <div class="stats">
            <div class="stat"><div class="k">bf instructions</div><div class="v">${stats ? stats.instrCount : '—'}</div></div>
            <div class="stat"><div class="k">wasm module size</div><div class="v">${stats ? stats.byteLen + ' bytes' : '—'}</div></div>
            <div class="stat"><div class="k">compile to wasm</div><div class="v accent2">${stats ? stats.compileMs.toFixed(3) + ' ms' : '—'}</div></div>
            <div class="stat"><div class="k">wasm -> x64 jit</div><div class="v accent">${stats ? stats.jitMs.toFixed(3) + ' ms' : '—'}</div></div>
            <div class="stat" style="grid-column: 1 / -1;"><div class="k">native execution</div><div class="v accent">${stats ? stats.execMs.toFixed(3) + ' ms' : '—'}</div></div>
            </div>
        </div>

        <div class="panel">
            <div class="panel-hd"><span class="t">کد منبع وب اسمبلی (.WASM) به هکس:</span></div>
            <div class="hex">${wasmBytes ? toHex(wasmBytes) : 'compile a program to see its machine-readable bytecode'}</div>
        </div>
    </div>
  `;
}

render(html`<${App} />`, document.getElementById('bf-wasm'));