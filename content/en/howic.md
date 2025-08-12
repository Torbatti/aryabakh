
```c
// VARIABLE/STATIC
#define persist_local   static
#define persist_global  static

// FUNCTION
// #define fn
#define fn_internal static
#define fn_external extern
```

```c
// UNSIGNED INT
typedef uint8_t  u8;
typedef uint16_t u16;
typedef uint32_t u32;
typedef uint64_t u64;

// SIGNED INT
typedef int8_t  i8;
typedef int16_t i16;
typedef int32_t i32;
typedef int64_t i64;

// FLOAT INT
typedef float  f32;
typedef double f64;
```

```c
// BOOL - works with c++
#define bool u8
#define true  1
#define false 0
typedef u8  b8;
typedef u16 b16;
typedef u32 b32;
typedef u64 b64;
```

```c
// typedef char16_t  c16; // UTF-16
typedef wchar_t wchar; // wide character , used in win api
typedef int32_t rune;  // unicode codepoint
```

```c
// ENUM
#define enum8(type)  u8
#define enum16(type) u16
#define enum32(type) u32
#define enum64(type) u64
```

# ARENA Alocator
# GOTO - good/bad
# libraries should accept io/allocators provided by user

# compiler
# debugers
- raddbg
- lldb
- gdb
- valgrind

# profilers
- tracy
- spall-web

# error handling
- handle like errors in go

# testing
- i have no idea how you can do this in c
- i myself use zig test runner and call c functions

# Learn C
https://beej.us/guide/bgc/
https://beej.us/guide/bgclr/
effective c book by robert c. seacord
