// lib-bf-jit.js
// Compiles Brainfuck source straight to a WebAssembly binary module, in
// pure JS, with no external toolchain.
//
// Why WASM and not "real" x64 bytes: a browser tab has no way to write
// bytes into executable memory and jump to them directly — that door is
// (deliberately) closed. WebAssembly.compile() is the sanctioned door in:
// hand it a .wasm binary and the engine's own JIT (V8's Liftoff/TurboFan,
// or the equivalent in other browsers) compiles it straight to native x64
// machine code before instantiation. So "JIT compiler" here means: this
// module is the front end (Brainfuck -> WASM bytecode), and the browser
// supplies the back end (WASM bytecode -> x64). Each '[' / ']' pair in the
// source becomes a structured wasm block/loop, and cell arithmetic maps
// directly onto i32.load8_u / i32.store8, so the resulting machine code
// looks close to what a human would write by hand in WAT.

const TAPE_SIZE = 65536; // exactly one WASM page (64 KiB), matches the interpreter's tape

// ---- LEB128 + binary-format helpers -------------------------------------

function unsignedLEB128(value) {
  const bytes = [];
  let v = value >>> 0;
  do {
    let byte = v & 0x7f;
    v >>>= 7;
    if (v !== 0) byte |= 0x80;
    bytes.push(byte);
  } while (v !== 0);
  return bytes;
}

function signedLEB128(value) {
  const bytes = [];
  let v = value | 0;
  let more = true;
  while (more) {
    let byte = v & 0x7f;
    v >>= 7;
    if ((v === 0 && (byte & 0x40) === 0) || (v === -1 && (byte & 0x40) !== 0)) {
      more = false;
    } else {
      byte |= 0x80;
    }
    bytes.push(byte);
  }
  return bytes;
}

/** wasm "vec": a LEB128 length prefix followed by the concatenated items. */
function vec(items) {
  return [...unsignedLEB128(items.length), ...items.flat()];
}

/** A module section: id byte, LEB128 byte-length, then the content. */
function section(id, content) {
  return [id, ...unsignedLEB128(content.length), ...content];
}

function memarg(align, offset) {
  return [...unsignedLEB128(align), ...unsignedLEB128(offset)];
}

function utf8Vec(str) {
  const bytes = [...str].map((c) => c.charCodeAt(0));
  return [...unsignedLEB128(bytes.length), ...bytes];
}

const OP = {
  block: 0x02,
  loop: 0x03,
  end: 0x0b,
  br: 0x0c,
  br_if: 0x0d,
  call: 0x10,
  local_get: 0x20,
  local_set: 0x21,
  i32_load8_u: 0x2d,
  i32_store8: 0x3a,
  i32_const: 0x41,
  i32_eqz: 0x45,
  i32_add: 0x6a,
  i32_sub: 0x6b,
  i32_and: 0x71,
};
const BLOCKTYPE_VOID = 0x40;
const VALTYPE_I32 = 0x7f;
const TYPE_FUNC = 0x60;
const IMPORT_KIND_FUNC = 0x00;
const EXPORT_KIND_FUNC = 0x00;
const EXPORT_KIND_MEM = 0x02;

// ---- Brainfuck -> WASM bytecode ------------------------------------------

/**
 * Compiles Brainfuck source into a raw WASM binary module (Uint8Array).
 *
 * Module shape:
 *   imports: env.outputChar(i32) -> ()   [func index 0]
 *            env.inputChar() -> i32       [func index 1]
 *   memory:  1 page (64 KiB), exported as "mem" — this *is* the tape
 *   func:    exported as "run", () -> (), local 0 = tape pointer (i32)
 */
export function compileToWasmBytes(source) {
  const ops = [...source].filter((c) => '><+-.,[]'.includes(c));

  const PTR = 0; // local index of the tape pointer
  const body = [];
  const push = (bytes) => body.push(...bytes);
  const loopDepthTracker = []; // only used to give a friendly error on mismatch

  for (const ch of ops) {
    switch (ch) {
      case '>':
        push([OP.local_get, ...unsignedLEB128(PTR)]);
        push([OP.i32_const, ...signedLEB128(1)]);
        push([OP.i32_add]);
        push([OP.i32_const, ...signedLEB128(TAPE_SIZE - 1)]);
        push([OP.i32_and]);
        push([OP.local_set, ...unsignedLEB128(PTR)]);
        break;
      case '<':
        push([OP.local_get, ...unsignedLEB128(PTR)]);
        push([OP.i32_const, ...signedLEB128(-1)]);
        push([OP.i32_add]);
        push([OP.i32_const, ...signedLEB128(TAPE_SIZE - 1)]);
        push([OP.i32_and]);
        push([OP.local_set, ...unsignedLEB128(PTR)]);
        break;
      case '+':
        push([OP.local_get, ...unsignedLEB128(PTR)]); // addr (for the store)
        push([OP.local_get, ...unsignedLEB128(PTR)]); // addr (for the load)
        push([OP.i32_load8_u, ...memarg(0, 0)]);
        push([OP.i32_const, ...signedLEB128(1)]);
        push([OP.i32_add]);
        push([OP.i32_store8, ...memarg(0, 0)]);
        break;
      case '-':
        push([OP.local_get, ...unsignedLEB128(PTR)]);
        push([OP.local_get, ...unsignedLEB128(PTR)]);
        push([OP.i32_load8_u, ...memarg(0, 0)]);
        push([OP.i32_const, ...signedLEB128(1)]);
        push([OP.i32_sub]);
        push([OP.i32_store8, ...memarg(0, 0)]);
        break;
      case '.':
        push([OP.local_get, ...unsignedLEB128(PTR)]);
        push([OP.i32_load8_u, ...memarg(0, 0)]);
        push([OP.call, ...unsignedLEB128(0)]); // import 0 = outputChar
        break;
      case ',':
        push([OP.local_get, ...unsignedLEB128(PTR)]); // addr for the store below
        push([OP.call, ...unsignedLEB128(1)]); // import 1 = inputChar -> i32
        push([OP.i32_store8, ...memarg(0, 0)]);
        break;
      case '[':
        // block { loop { if tape[ptr]==0 br out-of-block; <body>; br loop-top } }
        push([OP.block, BLOCKTYPE_VOID]);
        push([OP.loop, BLOCKTYPE_VOID]);
        push([OP.local_get, ...unsignedLEB128(PTR)]);
        push([OP.i32_load8_u, ...memarg(0, 0)]);
        push([OP.i32_eqz]);
        push([OP.br_if, ...unsignedLEB128(1)]); // depth 1 = the enclosing block
        loopDepthTracker.push(ch);
        break;
      case ']':
        push([OP.local_get, ...unsignedLEB128(PTR)]);
        push([OP.i32_load8_u, ...memarg(0, 0)]);
        push([OP.br_if, ...unsignedLEB128(0)]); // depth 0 = back to loop top
        push([OP.end]); // end loop
        push([OP.end]); // end block
        if (loopDepthTracker.pop() === undefined) {
          throw new SyntaxError("Unmatched ']'");
        }
        break;
    }
  }
  if (loopDepthTracker.length > 0) {
    throw new SyntaxError("Unmatched '['");
  }
  push([OP.end]); // end function body

  const localsDeclaration = [
    ...unsignedLEB128(1), // one group of locals...
    ...unsignedLEB128(1), //   ...containing 1 local...
    VALTYPE_I32, //           ...of type i32
  ];
  const funcBody = [...localsDeclaration, ...body];
  const funcBodyWithSize = [...unsignedLEB128(funcBody.length), ...funcBody];

  // Type section: type0 ()->(), type1 (i32)->(), type2 ()->(i32)
  const typeVoidVoid = [TYPE_FUNC, ...vec([]), ...vec([])];
  const typeI32Void = [TYPE_FUNC, ...vec([VALTYPE_I32]), ...vec([])];
  const typeVoidI32 = [TYPE_FUNC, ...vec([]), ...vec([VALTYPE_I32])];
  const typeSection = section(1, vec([typeVoidVoid, typeI32Void, typeVoidI32]));

  // Import section: env.outputChar (type1) -> func idx 0, env.inputChar (type2) -> func idx 1
  const importOutputChar = [...utf8Vec('env'), ...utf8Vec('outputChar'), IMPORT_KIND_FUNC, ...unsignedLEB128(1)];
  const importInputChar = [...utf8Vec('env'), ...utf8Vec('inputChar'), IMPORT_KIND_FUNC, ...unsignedLEB128(2)];
  const importSection = section(2, vec([importOutputChar, importInputChar]));

  // Function section: our single defined function (idx 2) uses type0
  const functionSection = section(3, vec([[...unsignedLEB128(0)]]));

  // Memory section: 1 page = 64 KiB, exactly the Brainfuck tape
  const memorySection = section(5, vec([[0x00, ...unsignedLEB128(1)]]));

  // Export section: "run" (func idx 2), "mem" (memory idx 0)
  const exportRun = [...utf8Vec('run'), EXPORT_KIND_FUNC, ...unsignedLEB128(2)];
  const exportMem = [...utf8Vec('mem'), EXPORT_KIND_MEM, ...unsignedLEB128(0)];
  const exportSection = section(7, vec([exportRun, exportMem]));

  // Code section: the one function body
  const codeSection = section(10, vec([funcBodyWithSize]));

  const magic = [0x00, 0x61, 0x73, 0x6d]; // "\0asm"
  const version = [0x01, 0x00, 0x00, 0x00];

  return new Uint8Array([
    ...magic,
    ...version,
    ...typeSection,
    ...importSection,
    ...functionSection,
    ...memorySection,
    ...exportSection,
    ...codeSection,
  ]);
}

/**
 * Compiles `source` to a WebAssembly.Module once — this is the step where
 * the browser's own compiler turns our bytecode into native x64 — and
 * returns a reusable runner. Each run() call only pays for instantiation
 * (which gives a fresh, zeroed tape for free) plus execution.
 */
export async function compileJit(source) {
  const bytes = compileToWasmBytes(source);
  const t0 = performance.now();
  const module = await WebAssembly.compile(bytes);
  const compileTimeMs = performance.now() - t0;

  return {
    kind: 'jit',
    wasmByteLength: bytes.length,
    compileTimeMs,
    async run(input = '') {
      const outBytes = [];
      let inPos = 0;
      const importObject = {
        env: {
          outputChar: (byte) => outBytes.push(byte & 0xff),
          inputChar: () => (inPos < input.length ? input.charCodeAt(inPos++) & 0xff : 0),
        },
      };
      const instance = await WebAssembly.instantiate(module, importObject);
      instance.exports.run();
      return { output: String.fromCharCode(...outBytes) };
    },
  };
}

/** One-shot convenience helper: compiles and runs immediately. */
export async function runBrainfuckJit(source, input = '') {
  const jit = await compileJit(source);
  return jit.run(input);
}

export const JIT_TAPE_SIZE = TAPE_SIZE;
