import { html } from "htm/preact";
import { useState, useCallback } from 'preact/hooks';

export function App() {
    const [programItem, setProgramItem] = useState(0);

    const defult_program_description = "یک برنامه آماده را انتخاب کنید یا برنامه خود را وارد کنید."
    const [programDescription, setProgramDescription] = useState(defult_program_description);

    const [programCode, setProgramCode] = useState('');
    const [programInput, setProgramInput] = useState('');
    const [programOutput, setProgramOutput] = useState(' ');

    const [programCodeRow, setProgramCodeRow] = useState(4);
    const [programInputRow, setProgramInputRow] = useState(2);

    const handleProgramItemChange = (item, index) => {
        setProgramItem(index)
        setProgramCode(program_items[index].code)
        setProgramDescription(program_items[index].description)
        if (program_items[index] !== "") { setProgramInput(program_items[index].input) }

        const input_lines = program_items[index].input.split('\n').length
        setProgramInputRow(input_lines)

        const program_lines = program_items[index].code.split('\n').length
        if (program_lines > 10) { setProgramCodeRow(10); }
        else { setProgramCodeRow(program_lines) }
    }

    const handleProgramCodeChange = (e) => {
        const program_code = e.currentTarget.value
        setProgramCode(e.currentTarget.value)

        const program_lines = program_code.split('\n').length
        if (program_lines > 10) { setProgramCodeRow(10); }
        else { setProgramCodeRow(program_lines) }
    }

    const handleProgramInputChange = (e) => {
        const program_input = e.currentTarget.value
        const input_lines = program_input.split('\n').length
        setProgramInput(e.currentTarget.value)
        setProgramInputRow(input_lines)
    }

    function brainfuck_run() {
        const memory = new Uint8Array(30000);
        let dp = 0, ip = 0, ic = 0, out = '';

        // Precompute bracket jumps
        const jumps = {};
        const stack = [];
        for (let i = 0; i < programCode.length; i++) {
            if (programCode[i] === '[') stack.push(i);
            else if (programCode[i] === ']') {
                const j = stack.pop();
                jumps[j] = i;
                jumps[i] = j;
            }
        }

        const MAX_STEPS = 1e8; // maximum number of steps
        let steps = 0;
        while (ip < programCode.length && steps++ < MAX_STEPS) {
            switch (programCode[ip]) {
                case '>': dp = (dp + 1) % 30000; break;
                case '<': dp = (dp + 29999) % 30000; break;
                case '+': (memory[dp]++); break;
                case '-': (memory[dp]--); break;
                case '.': out += String.fromCharCode(memory[dp]); break;
                case ',': memory[dp] = ic < programInput.length ? programInput.charCodeAt(ic++) : 0; break;
                case '[': if (!memory[dp]) ip = jumps[ip]; break;
                case ']': if (memory[dp]) ip = jumps[ip]; break;
            }
            ip++;
        }

        setProgramOutput(steps >= MAX_STEPS ? "Steps: " + steps + "\n\n" + out + '\n\n[halted: step limit reached]' : "Steps: " + steps + "\n\n" + out);
    }

    return html`
    <div id="bf-interpreter">

        <div id="title">
            <h2>ترجمار</h2>
            <button onclick=${() => brainfuck_run()}>شروع</button>
        </div>

        <p id="des" class="rtl">${programDescription}</p>

        <div id="bf-items">
            ${program_items.map((item, i) => html`
                <button key=${i} onClick=${() => handleProgramItemChange(item, i)}>
                    ${item.name}
                </button>
            `)}
        </div>


        <p>برنامه :</p>
        <textarea id="prog" class="ltr" rows=${programCodeRow} onInput=${(e) => handleProgramCodeChange(e)} value=${programCode}></textarea>

        <p>ورودی :</p>
        <textarea id="inp" class="ltr" rows=${programInputRow} onInput=${(e) => handleProgramInputChange(e)} value=${programInput}></textarea>

        <p>خروجی :</p>
        <p id="out" class="ltr">${programOutput}</p>
    </div>
    `;
}
// 
// 
// 
const hello_world_bf_description = `ساده ترین برنامه در برینفورک ، سلام به دنیا.`
const hello_world_bf_code = `>>+<--[[<++>->-->+++>+<<<]-->++++]<<.<<-.<<..+++.>.<<-.>.+++.------.>>-.<+.>>.`

// 
// 
// 
const e_bf_description = `محاسبه عدد اویلر تا زمانی که حافظه یا تعداد پرش ها تمام شوند.`
const e_bf_code = `[e.b -- compute e
(c) 2016 Daniel B. Cristofani
http://brainfuck.org/]

>>>>++>+>++>+>>++<+[  
  [>[>>[>>>>]<<<<[[>>>>+<<<<-]<<<<]>>>>>>]+<]>-
  >>--[+[+++<<<<--]++>>>>--]+[>>>>]<<<<[<<+<+<]<<[
    >>>>>>[[<<<<+>>>>-]>>>>]<<<<<<<<[<<<<]
    >>-[<<+>>-]+<<[->>>>[-[+>>>>-]-<<-[>>>>-]++>>+[-<<<<+]+>>>>]<<<<[<<<<]]
    >[-[<+>-]]+<[->>>>[-[+>>>>-]-<<<-[>>>>-]++>>>+[-<<<<+]+>>>>]<<<<[<<<<]]<<
  ]>>>+[>>>>]-[+<<<<--]++[<<<<]>>>+[
    >-[
      >>[--[++>>+>>--]-<[-[-[+++<<<<-]+>>>>-]]++>+[-<<<<+]++>>+>>]
      <<[>[<-<<<]+<]>->>>
    ]+>[>>>>]-[+<<<<--]++<[
      [>>>>]<<<<[
        -[+>[<->-]++<[[>-<-]++[<<<<]+>>+>>-]++<<<<-]
        >-[+[<+[<<<<]>]<+>]+<[->->>>[-]]+<<<<
      ]
    ]>[<<<<]>[
      -[
        -[
          +++++[>++++++++<-]>-.>>>-[<<<----.<]<[<<]>>[-]>->>+[
            [>>>>]+[-[->>>>+>>>>>>>>-[-[+++<<<<[-]]+>>>>-]++[<<<<]]+<<<<]>>>
          ]+<+<<
        ]>[
          -[
            ->[--[++>>>>--]->[-[-[+++<<<<-]+>>>>-]]++<+[-<<<<+]++>>>>]
            <<<<[>[<<<<]+<]>->>
          ]<
        ]>>>>[--[++>>>>--]-<--[+++>>>>--]+>+[-<<<<+]++>>>>]<<<<<[<<<<]<
      ]>[>+<<++<]<
    ]>[+>[--[++>>>>--]->--[+++>>>>--]+<+[-<<<<+]++>>>>]<<<[<<<<]]>>
  ]>
]

This program computes the transcendental number e, in decimal. Because this is
infinitely long, this program doesn't terminate on its own; you will have to
kill it. The fact that it doesn't output any linefeeds may also give certain
implementations trouble, including some of mine.`

// 
// 
// 
const squares_bf_description = `محاسبه توان دو اعداد تا زمانی که حافظه یا تعداد پرش ها تمام شوند.`
const squares_bf_code = `++++[>+++++<-]>[<+++++>-]+<+[
    >[>+>+<<-]++>>[<<+>>-]>>>[-]++>[-]+
    >>>+[[-]++++++>>>]<<<[[<++++++++<++>>-]+<.<[>----<-]<]
    <<[>>>>>[>>>[-]+++++++++<[>-<-]+++++++++>[-[<->-]+[<<<]]<[>+<-]>]<<-]<<-
]
[Outputs square numbers from 0 to 10000.
Daniel B Cristofani (cristofdathevanetdotcom)
http://www.hevanet.com/cristofd/brainfuck/]`

// 
// 
// 
const bfi_bf_description = `یک مفصر برین فورک در برین فورک که ورودی را اجرا میکند.`
const bfi_bf_code = `>,[>+++<-------------------------------------------[>++++<-[>---<-[>++
++<-[>---<--------------[>+<--[>-----<-----------------------------[>+
<--[>--<[-]]]]]]]]]>[>>]<,]<[<<]>>[>+<-[-[-[-[-[-[-[-[[-]>[-]<]>[-<<++
++++++>>>[>>]>>>[>>]<.<[<<]<<<[<<]>]<]>[-<<+++++++>>>[>>]>>>[>>]<,<[<<
]<<<[<<]>]<]>[-<<++++++>>>[>>]>>>[>>]+[<<]<<<[<<]>]<]>[-<<+++++>>>[>>]
<+>>>>[[>>]<<-<<[<<]]<<[->>]<<<[<<]>]<]>[-<<++++>>>[>>]>>>[>>]<-<[<<]<
<<[<<]>]<]>[-<<+++>>>[>>]>>>[>>]<+<[<<]<<<[<<]>]<]>[-<<++>>>[>>]>>>[>>
]<[<[<<]<<<[<<]++<-->>+[<<<-[>>>+<<]<[<]>-[>>>-<<]<[<]>++>>>[-<<+>>]<<
]<-<+>>>[>>]<+>>]<[<<]<[->]<<[<<]>]<]>[-<<+>>>[>>]>>>[>>]<>>>+<<<<[-]>
[>>>-<<<<]>[>]>>[-<<+>>]<<<<+>>[-<<[<<]<[>>]<<[<<]+<[>>>-[<<<->>]>[>]<
-[<<<+>>]>[>]<++<<<[->>+<<]>>]++>-->>[>>]>[-]]<<[<<]>>[<<]<[>>]>[-]<<<
[<<]>]<<[->+<]>>>]
[Brainfuck in Brainfuck . https://github.com/L4Vo5/brainfuck-in-brainfuck]`
const bfi_bf_input = hello_world_bf_code;

// 
// 
// 
const fib_bf_description = `محاسبه اعداد فیبوناچی تا زمانی که حافظه یا تعداد پرش ها تمام شوند.`
const fib_bf_code = `>++++++++++>+>+[
    [+++++[>++++++++<-]>.<++++++[>--------<-]+<<<]>.>>[
        [-]<[>+<-]>>[<<+>+>-]<[>+<-[>+<-[>+<-[>+<-[>+<-[>+<-
            [>+<-[>+<-[>+<-[>[-]>+>+<<<-[>+<-]]]]]]]]]]]+>>>
    ]<<<
]
This program doesn't terminate; you will have to kill it.
Daniel B Cristofani (cristofdathevanetdotcom)
http://www.hevanet.com/cristofd/brainfuck/`

// 
// 
// 
const factorial2_bf_description = `محاسبه اعداد فاکتوریل تا زمانی که حافظه یا تعداد پرش ها تمام شوند.`
const factorial2_bf_code = `[factorial2.b -- compute factorials
(c) 2019 Daniel B. Cristofani
http://brainfuck.org/]

>>>>++>+[
    [
        >[>>]<[>+>]<<[>->>+<<<-]>+[
            [+>>[<<+>>-]>]+[-<<+<]>-[
                -[<+>>+<-]++++++[>++++++++<-]+>.[-]<<[
                    >>>[[<<+>+>-]>>>]<<<<[[>+<-]<-<<]>-
                ]>>>[
                    <<-[<<+>>-]<+++++++++<[
                        >[->+>]>>>[<<[<+>-]>>>+>>[-<]<[>]>+<]<<<<<<-
                    ]>[-]>+>>[<<<+>>>-]>>>
                ]<<<+[-[+>>]<<<]>[<<<]>
            ]>>>[<[>>>]<<<[[>>>+<<<-]<<<]>>>>>>>-[<]>>>[<<]<<[>+>]<]<<
        ]++>>
    ]<<++++++++.+
]

This program computes the factorials (https://oeis.org/A000142). Because this
sequence is infinitely long, this program doesn't terminate on its own; you will
have to kill it. This program is much faster than my earlier factorial program.
`

// 
// 
// 
const random_bf_description = `محاسبه یک عدد شانسی بر حسب تعداد سلول های حافظه.`
const random_bf_code = `>>>++[
    <++++++++[
        <[<++>-]>>[>>]+>>+[
            -[->>+<<<[<[<<]<+>]>[>[>>]]]
            <[>>[-]]>[>[-<<]>[<+<]]+<<
        ]<[>+<-]>>-
    ]<.[-]>>
]
"Random" byte generator using the Rule 30 automaton.
Doesn't terminate; you will have to kill it.
To get x bytes you need 32x+4 cells.
Turn off any newline translation!
Daniel B Cristofani (cristofdathevanetdotcom)
http://www.hevanet.com/cristofd/brainfuck/`

// 
// 
// 
const golden_bf_description = `محاسبه عدد طلایی تا زمانی که حافظه یا تعداد پرش ها تمام شوند.`
const golden_bf_code = `[golden.b -- compute golden ratio
(c) 2019 Daniel B. Cristofani
http://brainfuck.org/]

+>>>>>>>++>+>+>+>++<[
    +[
        --[++>>--]->--[
            +[
                +<+[-<<+]++<<[-[->-[>>-]++<[<<]++<<-]+<<]>>>>-<<<<
                <++<-<<++++++[<++++++++>-]<.---<[->.[-]+++++>]>[[-]>>]
            ]+>>--
        ]+<+[-<+<+]++>>
    ]<<<<[[<<]>>[-[+++<<-]+>>-]++[<<]<<<<<+>]
    >[->>[[>>>[>>]+[-[->>+>>>>-[-[+++<<[-]]+>>-]++[<<]]+<<]<-]<]]>>>>>>>
]

This program computes the "golden ratio" (https://oeis.org/A001622). Because
this number is infinitely long, this program doesn't terminate on its own;
you will have to kill it.`

// 
// 
// 
const head_bf_description = `ده خط اول ورودی را به خروجی تبدیل میکند.`
const head_bf_code = `[head.b -- head (Unix utility)
(c) 2016 Daniel B. Cristofani
http://brainfuck.org/]

+>>>>>>>>>>-[,+[-.----------[[-]>]<->]<]

[This program outputs the first ten lines of its input.]`

// 
// 
// 
const wc_bf_description = `تعداد خط ها ، کلمات و بایت هارا نمایش میدهد.`
const wc_bf_code = `>>>+>>>>>+>>+>>+[<<],[
    -[-[-[-[-[-[-[-[<+>-[>+<-[>-<-[-[-[<++[<++++++>-]<
        [>>[-<]<[>]<-]>>[<+>-[<->[-]]]]]]]]]]]]]]]]
    <[-<<[-]+>]<<[>>>>>>+<<<<<<-]>[>]>>>>>>>+>[
        <+[
            >+++++++++<-[>-<-]++>[<+++++++>-[<->-]+[+>>>>>>]]
            <[>+<-]>[>>>>>++>[-]]+<
        ]>[-<<<<<<]>>>>
    ],
]+<++>>>[[+++++>>>>>>]<+>+[[<++++++++>-]<.<<<<<]>>>>>>>>]
[Counts lines, words, bytes. Assumes no-change-on-EOF or EOF->0.
Daniel B Cristofani (cristofdathevanetdotcom)
http://www.hevanet.com/cristofd/brainfuck/]`


const program_items = [
    { name: 'bfi.bf', description: bfi_bf_description, code: bfi_bf_code, input: bfi_bf_input },
    { name: 'hello_world.bf', description: hello_world_bf_description, code: hello_world_bf_code, input: "" },
    { name: 'e.bf', description: e_bf_description, code: e_bf_code, input: "" },
    { name: 'squares.bf', description: squares_bf_description, code: squares_bf_code, input: "" },
    { name: 'fib.bf', description: fib_bf_description, code: fib_bf_code, input: "" },
    { name: 'factorial2.bf', description: factorial2_bf_description, code: factorial2_bf_code, input: "" },
    { name: 'random.bf', description: random_bf_description, code: random_bf_code, input: "" },
    { name: 'golden.bf', description: golden_bf_description, code: golden_bf_code, input: "" },
    { name: 'head.bf', description: head_bf_description, code: head_bf_code, input: "" },
    { name: 'wc.bf', description: wc_bf_description, code: wc_bf_code, input: "" },
];
