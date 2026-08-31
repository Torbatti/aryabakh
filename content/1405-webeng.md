+++
template = "content/nevise.html"
draft = true

date = 1405-06-05

title = "مهندسی تحت وب"
description = "تنها چیزی که برای ساخت برنامه تحت وب باید داشته باشید."

[extra]
subject = "فنآوری,Technology"
+++
<div class="ltr">

## Observability
- Performance
- Logging 
- ????


## Testing
- Unit Testing / Smoke Testing
- Integration Testing / E2E Testing
- System Testing
- Coverage Testing
- Regression Testing
- Chaos Testing
- DOM Testing
- Snapshots Testing
- Mocks Testing
- Fuzz Testing
- Deterministic Simulation Testing
- Swarm Testing


## Data bases/pipelines
- Relational : [Sqlite](https://www.sqlite.org/) , [Posgresql](https://www.postgresql.org/)
- Analytical: [DuckDb](https://duckdb.org/)
- K-V / Cache : [Redis](https://redis.io/)/[Valkey](https://valkey.io/) 
- Vector: [Qdrant](https://github.com/qdrant/qdrant) , [Milvus](https://github.com/milvus-io/milvus) , [Weaviate](https://github.com/weaviate/weaviate)
- Queue : [RabitMQ](https://www.rabbitmq.com/)
- Event Streaming: [Apache Kafka](https://kafka.apache.org/)


## Desktop/Mobile Application
- [Tauri](https://tauri.app/) , [Electron](https://www.electronjs.org/): Recommended \[ WebView , Chromium embedded \]
- [React Native](https://reactnative.dev/) , [Ionic](https://ionicframework.com/): Not recommended \[ Swift , Kotlin \]


## Backend languages
- Go: \[ zero library/framework needed - [Chi](https://go-chi.io/) for routing is recommended \]
- [Ruby: Ruby on Rails](https://rubyonrails.org/) , [Python: Django](https://www.djangoproject.com/)
- Javascript: \[ [NextJs](https://nextjs.org/) , [AstroJs](https://astro.build/) , [Elysia](https://elysiajs.com/) \]
- Rust: \[ Axum , Actix , Leptos \] , Java , C#
- Elixir , Gleam


## Javascript Runtime
- [Node](https://nodejs.org/en) , [Bun](https://bun.sh/) , [Deno](https://deno.com/)


## Javascript?
- Javascript 
- Typescript
- JsDoc


## Javascript interesting library
- [Chart.js](https://www.chartjs.org) , [Mermaid.js](https://mermaid.js.org/) , [D3](https://d3js.org/) : data visualization
- [Playwright](https://playwright.dev/) , [Puppeteer](https://pptr.dev/) : automation testing
- [Xterm.js](https://xtermjs.org) , [node-pty](https://github.com/microsoft/node-pty) , [termDRAW](https://github.com/benvinegar/termdraw) : terminal related
- [monaco-editor](https://github.com/microsoft/monaco-editor) , [CodeMirror](https://codemirror.net/) : Code Editor
- [plate](https://platejs.org/) , [Lexical](https://lexical.dev/) , [Quill](https://quilljs.com/) , [Editor.js](https://editorjs.io/) : Text editor
- [pdf.js](https://github.com/mozilla/pdf.js) : PDF Reader in JavaScript
- [OpenTUI](https://opentui.com/) : Terminal UIs
- [Shiki](https://shiki.style/) : Syntax highlighter
- [Trees](https://trees.software/) : A file tree rendering library
- [Diffs](https://diffs.com/) : A diff rendering library
- [tldraw](https://github.com/tldraw/tldraw) , [excalidraw](https://github.com/excalidraw/excalidraw) : Virtual whiteboard, Infinite Canvas


## Javascript DOM/Ui library
- [Preact](https://preactjs.com/) , [Htmx](https://htmx.org/) , [AlpineJs](https://alpinejs.dev/) : no build step
- [React](https://react.dev/) , [SvelteJs](https://svelte.dev/)  , [SolidJs](https://www.solidjs.com/) , [VueJs](https://vuejs.org/) : has build step
- [Elm](https://elm-lang.org/) : has compile/build step


## Javascript Ui Component library
1. [BaseUi](https://base-ui.com/) , [RadixUi](https://www.radix-ui.com/) : Bare-bones/Unstylized
2. [Mui](https://mui.com/) , [ShadnCn](https://ui.shadcn.com/) : Fully fledged

<!-- 
## Web APIs | MDN : مثال و فهرست پشتیبانی و حداقل سال پشتیبانی
1. [Document Object Model (DOM)](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model) , [Console API](https://developer.mozilla.org/en-US/docs/Web/API/Console_API)
2. [Keyboard API](https://developer.mozilla.org/en-US/docs/Web/API/Keyboard_API) , [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API) , [Touch events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events) , [Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) , [Mouse Event](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent)
3. [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) , [Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) , [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest) , [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) , [Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)
4. [Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API) , [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) , [File API](https://developer.mozilla.org/en-US/docs/Web/API/File_API) , [File System API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) , [File and Directory Entries API](https://developer.mozilla.org/en-US/docs/Web/API/File_and_Directory_Entries_API) , [HTML Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
5. [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) , [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
6. [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API) , [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API)
7. [Encoding API (includes decoding)](https://developer.mozilla.org/en-US/docs/Web/API/Encoding_API) , [Compression Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API)
8. [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
9. [Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache) , [Cookie Store API](https://developer.mozilla.org/en-US/docs/Web/API/Cookie_Store_API) , [Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API) , [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
10. [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)
11. [Performance APIs](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API) , [Reporting API](https://developer.mozilla.org/en-US/docs/Web/API/Reporting_API) , [Permissions API](https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API) , [Screen Capture API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API) ,  [Media Capture and Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Capture_and_Streams_API)
- [Audio](s) , [Video](s) : اطلاعات دقیق ندارم
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) , [WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API) , [WebGPU API](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)
- [Resize Observer API](s) , [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) , [ScreenOrientation](https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation) ,  [Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API) , [Picture-in-Picture API](https://developer.mozilla.org/en-US/docs/Web/API/Picture-in-Picture_API)
- [Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API) , [Sensor APIs](https://developer.mozilla.org/en-US/docs/Web/API/Sensor_APIs)
- [Push API (dangerous)](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) -->






</div>