// lib-bf-interpreter.js
// A small, dependency-free Brainfuck interpreter.
//
// compileInterpreter(source) parses the source once (filtering to the 8
// Brainfuck instructions and precomputing a jump table for '[' / ']'), and
// returns a reusable runner. Repeated calls to .run(input) reuse the parsed
// program, so benchmarking N runs only pays for parsing once — the same
// shape as compileJit() in lib-bf-jit.js, which makes the two comparable.

const TAPE_SIZE = 65536; // must be a power of two (pointer wraps with a bitmask)

/**
 * Strips everything that isn't a Brainfuck instruction and builds a jump
 * table so that '[' and ']' can find their matching partner in O(1) at
 * run time instead of rescanning the program on every loop iteration.
 */
export function parseBrainfuck(source) {
  const program = [];
  for (const ch of source) {
    if ('><+-.,[]'.includes(ch)) program.push(ch);
  }

  const jumps = new Int32Array(program.length).fill(-1);
  const openStack = [];
  for (let i = 0; i < program.length; i++) {
    if (program[i] === '[') {
      openStack.push(i);
    } else if (program[i] === ']') {
      const openIndex = openStack.pop();
      if (openIndex === undefined) {
        throw new SyntaxError(`Unmatched ']' at instruction ${i}`);
      }
      jumps[openIndex] = i;
      jumps[i] = openIndex;
    }
  }
  if (openStack.length > 0) {
    throw new SyntaxError(`Unmatched '[' at instruction ${openStack[openStack.length - 1]}`);
  }

  return { program, jumps };
}

/**
 * Parses `source` once and returns a { kind, run(input) } object.
 * run(input) executes the program against a fresh 64 KiB tape every call
 * and returns { output, steps }.
 */
export function compileInterpreter(source) {
  const { program, jumps } = parseBrainfuck(source);
  const length = program.length;

  return {
    kind: 'interpreter',
    instructionCount: length,
    run(input = '') {
      const tape = new Uint8Array(TAPE_SIZE);
      let ptr = 0;
      let ip = 0;
      let inPos = 0;
      let out = '';
      let steps = 0;

      while (ip < length) {
        switch (program[ip]) {
          case '>':
            ptr = (ptr + 1) & (TAPE_SIZE - 1);
            break;
          case '<':
            ptr = (ptr - 1) & (TAPE_SIZE - 1);
            break;
          case '+':
            tape[ptr] = (tape[ptr] + 1) & 0xff;
            break;
          case '-':
            tape[ptr] = (tape[ptr] - 1) & 0xff;
            break;
          case '.':
            out += String.fromCharCode(tape[ptr]);
            break;
          case ',':
            tape[ptr] = inPos < input.length ? input.charCodeAt(inPos++) & 0xff : 0;
            break;
          case '[':
            if (tape[ptr] === 0) ip = jumps[ip];
            break;
          case ']':
            if (tape[ptr] !== 0) ip = jumps[ip];
            break;
        }
        ip++;
        steps++;
      }

      return { output: out, steps };
    },
  };
}

/** One-shot convenience helper: parses and runs immediately. */
export function runBrainfuck(source, input = '') {
  return compileInterpreter(source).run(input);
}

export const INTERPRETER_TAPE_SIZE = TAPE_SIZE;
