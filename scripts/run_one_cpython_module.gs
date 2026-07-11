! Run ONE vendored CPython regression-test module and print a single
! machine-readable GRAIL_RESULT line, then exit 0.  Driven per-module by
! scripts/run_cpython_suite.sh, one topaz session per module so that a
! SIGSEGV / HostCoreDump / hang in one module cannot take down the rest
! (the shell classifies a nonzero/timeout exit with no GRAIL_RESULT line
! as CRASH/TIMEOUT).
!
! Inputs (environment):
!   GRAIL_TEST_MODULE  dotted name of the module to score (e.g. test.test_math)
!   GRAIL_DIR          project root (defaults to the server cwd)
!
! Output (stdout): exactly one line, e.g.
!   GRAIL_RESULT|module=test.test_math|status=OK|tests=132|failures=0|errors=0|skipped=8|detail=
!
! status is one of: OK FAIL ERROR SKIP IMPORTERROR STERROR
! (CRASH / TIMEOUT are assigned by the shell driver, never printed here.)

iferr 1 stk
iferr 2 exit 1
login
run
| dir |
(dir := System gemEnvironmentVariable: 'GRAIL_DIR') ifNil:[
  System gemEnvironmentVariable: 'GRAIL_DIR' put: (dir := GsFile serverCurrentDirectory)
].
importlib grailDir: dir
%
run
| modName out clean emit harnessMod mod res tests fails errs skips status |
modName := (System gemEnvironmentVariable: 'GRAIL_TEST_MODULE') ifNil: ['<unset>'].
out := GsFile stdout.

"Strip the delimiter and control characters from a detail string so it
 cannot break the single-line GRAIL_RESULT format."
clean := [:s | | str lf cr tab |
  str := s isNil
    ifTrue: ['']
    ifFalse: [(s isKindOf: CharacterCollection) ifTrue: [s] ifFalse: [s printString]].
  "Cap length -- some Smalltalk errors embed a whole dict printString."
  str size > 240 ifTrue: [str := (str copyFrom: 1 to: 240) , ' ...'].
  lf := Character lf. cr := Character cr. tab := Character tab.
  str collect: [:c |
    ((c == $|) or: [(c == lf) or: [(c == cr) or: [c == tab]]])
      ifTrue: [$ ] ifFalse: [c]]].

"Emit the one result line (6 args -> valueWithArguments:)."
emit := [:st :tt :ff :ee :ss :dd |
  out
    nextPutAll: 'GRAIL_RESULT|module='; nextPutAll: modName;
    nextPutAll: '|status='; nextPutAll: st;
    nextPutAll: '|tests='; nextPutAll: tt printString;
    nextPutAll: '|failures='; nextPutAll: ff printString;
    nextPutAll: '|errors='; nextPutAll: ee printString;
    nextPutAll: '|skipped='; nextPutAll: ss printString;
    nextPutAll: '|detail='; nextPutAll: (clean value: dd);
    lf; flush].

"Layer 2: any catchable Smalltalk error escaping the harness itself ->
 STERROR (not a crash)."
[
  "Load the scoring helper (pulls the parent 'test' package + unittest)."
  harnessMod := importlib
    loadModuleFromPath: (importlib @env1:___moduleNameToPath___: 'test._grail_harness')
    name: 'test._grail_harness'.

  "Layer 1a: resolve + import the module under test, by its REAL dotted
   name (NOT __main__, so any `if __name__=='__main__': unittest.main()'
   tail does not fire and discovery works)."
  mod := [ | path |
      path := importlib @env1:___moduleNameToPath___: modName.
      path isNil
        ifTrue: [ Error signal: 'no file on search path for module ', modName ]
        ifFalse: [ importlib loadModuleFromPath: path name: modName ] ]
    on: AbstractException do: [:ex |
      "unittest.SkipTest raised at module scope (the CPython idiom for
       'this whole module needs an unavailable dependency', e.g.
       import_helper.import_module('_testcapi')) is a SKIP, not an
       import failure."
      (ex class name asString = 'SkipTest')
        ifTrue: [
          emit valueWithArguments: { 'SKIP'. 0. 0. 0. 0. (ex messageText ifNil: ['']) }.
          ExitClientError signal: 'module-skipped' status: 0 ].
      emit valueWithArguments: { 'IMPORTERROR'. 0. 0. 0. 0. (ex messageText ifNil: [ex class name]) }.
      ExitClientError signal: 'import-failed' status: 0 ].

  "Layer 1b: discover + run PER TEST, each under its own
   AbstractException rescue.  Running the whole suite in one Python
   call meant a single uncatchable Smalltalk escape (an MNU, an
   AlmostOutOfMemory in one memory-bomb test) classified the ENTIRE
   module STERROR with zero tests scored; per-test rescue counts that
   one test as an error and keeps scoring the rest."
  [ | cases n skipIds skipFile line |
    "Harness-level per-test skip list: tests whose failure mode is a
     HARD VM death (uncatchable OutOfMemory) that would void the whole
     module's scoring.  scripts/cpython_suite_skips.txt, counted in
     the skip column."
    skipIds := Set new.
    skipFile := GsFile openReadOnServer:
      (System gemEnvironmentVariable: 'GRAIL_DIR'), '/scripts/cpython_suite_skips.txt'.
    skipFile ifNotNil: [
      [(line := skipFile nextLine) isNil] whileFalse: [
        | parts |
        (line isEmpty or: [(line at: 1) == $#]) ifFalse: [
          parts := line subStrings: $|.
          (parts size >= 2 and: [(parts at: 1) = modName]) ifTrue: [
            skipIds add: (parts at: 2)]]].
      skipFile close].
    cases := harnessMod @env1:cases: mod.
    n := cases @env1:__len__.
    tests := 0. fails := 0. errs := 0. skips := 0.
    1 to: n do: [:i | | tc tcId |
      tc := cases @env1:__getitem__: (i - 1).
      tcId := [tc @env1:id asString] on: AbstractException do: [:ex | ''].
      "id() is 'test.test_x.Class.test_m'; the skip file holds the
       trailing 'Class.test_m'."
      "Progress line per test -- with one topaz session per module, the
       last GRAIL_TEST line in the .out names the culprit when the VM
       dies mid-run (uncatchable OOM)."
      out nextPutAll: 'GRAIL_TEST|'; nextPutAll: tcId; lf; flush.
      (skipIds detect: [:sid | tcId endsWith: sid] ifNone: [nil]) notNil ifTrue: [
        tests := tests + 1.
        skips := skips + 1 ]
      ifFalse: [
      [ | r |
        r := harnessMod @env1:run_one: tc.
        tests := tests + 1.
        fails := fails + (r @env1:__getitem__: 0).
        errs := errs + (r @env1:__getitem__: 1).
        skips := skips + (r @env1:__getitem__: 2).
      ] on: AbstractException do: [:ex |
        (ex isKindOf: ExitClientError) ifTrue: [ex pass].
        tests := tests + 1.
        errs := errs + 1 ]].
    ].
  ] value.

  status := (errs > 0)
    ifTrue: ['ERROR']
    ifFalse: [(fails > 0)
      ifTrue: ['FAIL']
      ifFalse: [((tests = 0) or: [tests = skips])
        ifTrue: ['SKIP']
        ifFalse: ['OK']]].

  emit valueWithArguments: { status. tests. fails. errs. skips. '' }.
  ExitClientError signal: 'done' status: 0.
] on: AbstractException do: [:ex |
  (ex isKindOf: ExitClientError) ifTrue: [ex pass].
  emit valueWithArguments: { 'STERROR'. 0. 0. 0. 0. (ex messageText ifNil: [ex class name]) }.
  ExitClientError signal: 'st-error' status: 0].
%
logout
! Reachable only if the run aborted before its clean ExitClientError
! (e.g. a topaz-level error) -- fail loudly so the shell sees CRASH.
exit 1
