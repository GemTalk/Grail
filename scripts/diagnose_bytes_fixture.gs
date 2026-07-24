! Diagnostic: reproduce BytesSubclassTestCase>>setUp on the CI (Linux) host to
! find why loading tests/python/bytes_subclass.py throws there but not on macOS.
!
! Run by .github/workflows/diagnose-bytes.yml AFTER install_base.sh + install.sh,
! under the same `LC_ALL=C` topaz the SUnit shards use.  Emits DIAG| lines and,
! if the load throws, a full `where` stack (iferr) pinpointing the failing
! method -- so we can tell a codec throw from an `import array` throw from a
! compile-time wide-string-literal throw.
!
! This file is deliberately PURE ASCII: the wide characters are written as
! Python \u / \x escapes so that topaz reading THIS script under LC_ALL=C can
! never itself corrupt them.  The raw-multibyte source question is covered by
! Phase 1/3, which load the actual fixture file (read as explicit UTF-8).
iferr 1 where
iferr 2 stk
login
run
| dir |
(dir := System gemEnvironmentVariable: 'GRAIL_DIR') ifNil:[
  System gemEnvironmentVariable: 'GRAIL_DIR' put: (dir := GsFile serverCurrentDirectory)
].
importlib grailDir: dir.
true
%

! ---- Phase 1: load exactly as setUp does, with a friendly capture ----
run
| out mod results bad loadErr path |
out := GsFile stdout.
path := importlib grailDir , '/tests/python/bytes_subclass.py'.
out nextPutAll: 'DIAG|grailDir='; nextPutAll: importlib grailDir; lf.
out nextPutAll: 'DIAG|exists='; nextPutAll: (GsFile existsOnServer: path) printString; lf.
loadErr := nil. mod := nil.
[
  importlib @env1:modules removeKey: #'bytes_subclass' ifAbsent: [].
  mod := importlib loadModuleFromPath: path name: 'bytes_subclass'.
] on: AbstractException do: [:ex |
  loadErr := ex.
  out nextPutAll: 'DIAG|load=THREW|class='; nextPutAll: ex class name;
    nextPutAll: '|msg='; nextPutAll: (ex messageText ifNil: ['<nil>']); lf.
  ex return: nil
].
loadErr isNil ifTrue: [
  out nextPutAll: 'DIAG|load=OK'; lf.
  results := mod @env1:___pyAttrLoad___: #RESULTS.
  bad := OrderedCollection new.
  (results @env1:keys) do: [:k | | v |
    v := [ results @env1:__getitem__: k ]
      on: AbstractException
      do: [:e | e return: ('THREW:' , e class name , ':' , (e messageText ifNil: [''])) ].
    (v == true) ifFalse: [ bad add: (k printString , ' -> ' , v printString) ] ].
  out nextPutAll: 'DIAG|results='; nextPutAll: (results @env1:__len__) printString; lf.
  bad isEmpty
    ifTrue: [ out nextPutAll: 'DIAG|allTrue=YES'; lf ]
    ifFalse: [ bad do: [:s | out nextPutAll: 'DIAG|bad|'; nextPutAll: s; lf ] ] ].
out nextPutAll: 'DIAG|phase1-done'; lf.
true
%

! ---- Phase 2: targeted sub-probes via the parse+evaluate path (like the MCP
!      eval), each isolating one suspect so the CI log says WHICH one throws.
!      Wide chars are \u escapes so the .gs stays ASCII; the Grail parser turns
!      them into the same wide (>255) codepoints the fixture uses. ----
run
| out ok evalPython |
out := GsFile stdout.
evalPython := [:src |
  | moduleScope scope module |
  moduleScope := SymbolDictionary new.
  scope := System myUserProfile symbolList copy.
  scope insertObject: moduleScope at: 1.
  module := ModuleAst parseSource: src.
  module useTempsForBlock: false.
  module ensureModuleScope: moduleScope.
  module evaluateWithScope: scope].
ok := [:label :src |
  [ evalPython value: src.
    out nextPutAll: 'DIAG|probe|'; nextPutAll: label; nextPutAll: '=OK'; lf ]
  on: AbstractException
  do: [:ex |
    out nextPutAll: 'DIAG|probe|'; nextPutAll: label;
      nextPutAll: '=THREW|class='; nextPutAll: ex class name;
      nextPutAll: '|msg='; nextPutAll: (ex messageText ifNil: ['<nil>']); lf.
    ex return: nil ] ].

"A) build + evaluate a wide (>255 codepoint) string via chr() -- no multibyte
    in this file, so it isolates wide-char HANDLING from raw-source file reading."
ok value: 'wide-string-chr' value: 'len("Hi" + chr(0x1234) + chr(0x5678))'.
"B) utf-8 decode of raw bytes -> wide char (fixture line 348)."
ok value: 'utf8-decode' value: 'bytes(b"\xe2\x98\x83").decode()'.
"C) utf-16 encode + decode round-trip of a wide string (fixture lines 343/345/352)."
ok value: 'utf16-roundtrip' value: 'bytes("Hi" + chr(0x1234) + chr(0x5678), "utf-16").decode("utf-16")'.
"D) latin-1 strict encode of a wide char -- fixture expects UnicodeEncodeError."
ok value: 'latin1-encode-raises' value: 'bytes(chr(0x1234), "latin-1")'.
"E) import array + array.array(...) through fromhex (the eager unwrapped key)."
ok value: 'import-array-fromhex' value: 'bytes.fromhex(__import__("array").array("B", b" 41 42 "))'.
out nextPutAll: 'DIAG|phase2-done'; lf.
true
%

! ---- Phase 3: bare reload -- if it throws, `iferr where` dumps the full stack
!      that names the exact failing method. ----
run
importlib @env1:modules removeKey: #'bytes_subclass' ifAbsent: [].
importlib loadModuleFromPath: (importlib grailDir , '/tests/python/bytes_subclass.py') name: 'bytes_subclass'.
GsFile stdout nextPutAll: 'DIAG|phase3-reload=OK'; lf.
true
%
logout
exit 0
