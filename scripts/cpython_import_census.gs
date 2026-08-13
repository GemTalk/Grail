! Probe whether Grail can import each of a list of stdlib module names, one
! line of machine-readable output per name, then exit 0.  Driven by
! scripts/cpython_import_census.py, which decides WHICH names to probe and
! interprets the results.
!
! This is the cheap half of "how far is the CPython suite from done": wiring a
! test module into scripts/cpython_suite_manifest.txt means vendoring its test
! file first, but whether the module it TESTS can be imported at all is one
! import away, and that is what says whether the test file is worth vendoring.
!
! Inputs (environment):
!   GRAIL_CENSUS_NAMES   path to a file of module names, one per line
!   GRAIL_CENSUS_OFFSET  0-based index of the first name to probe (default 0)
!   GRAIL_CENSUS_LIMIT   how many to probe from there (default: all remaining)
!   GRAIL_DIR            project root (defaults to the server cwd)
!
! Output (stdout), one per probed name plus a progress line before each:
!   CENSUS_PROBE|<name>
!   CENSUS|<name>|IMPORTS|
!   CENSUS|<name>|MISSING|<message>
!   CENSUS|<name>|ERROR|<ExceptionClass: message>
!
! The progress line matters: an import that kills the session (a hard VM error
! no handler can catch) leaves its CENSUS_PROBE with no CENSUS, which is
! exactly how the driver names the culprit and resumes past it.

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
| namesPath file line names out offset limit builtinsMod clean |
namesPath := System gemEnvironmentVariable: 'GRAIL_CENSUS_NAMES'.
namesPath isNil ifTrue: [
  GsFile stdout nextPutAll: 'CENSUS_FATAL|GRAIL_CENSUS_NAMES unset'; lf.
  ExitClientError signal: 'no-names' status: 1].
out := GsFile stdout.
names := OrderedCollection new.
file := GsFile openReadOnServer: namesPath.
file isNil ifTrue: [
  out nextPutAll: 'CENSUS_FATAL|cannot read '; nextPutAll: namesPath; lf.
  ExitClientError signal: 'no-names-file' status: 1].
[(line := file nextLine) isNil] whileFalse: [
  line := line trimSeparators.
  line isEmpty ifFalse: [names add: line]].
file close.

offset := (System gemEnvironmentVariable: 'GRAIL_CENSUS_OFFSET')
  ifNil: [0] ifNotNil: [:s | s asNumber].
limit := (System gemEnvironmentVariable: 'GRAIL_CENSUS_LIMIT')
  ifNil: [names size] ifNotNil: [:s | s asNumber].

"Same one-line hygiene the scoreboard driver applies: strip the field
 delimiter and anything non-printable so one weird message cannot corrupt the
 record format."
clean := [:s | | str ws |
  str := s isNil
    ifTrue: ['']
    ifFalse: [(s isKindOf: CharacterCollection) ifTrue: [s] ifFalse: [s printString]].
  str size > 200 ifTrue: [str := (str copyFrom: 1 to: 200) , ' ...'].
  ws := WriteStream on: String new.
  str do: [:c | | cp |
    cp := c codePoint.
    ((c == $|) or: [(cp between: 32 and: 126) not])
      ifTrue: [ws nextPut: $ ]
      ifFalse: [ws nextPut: c]].
  ws contents].

"The real import path -- the same builtins.__import__ a Python ``import x''
 statement reaches -- so a Smalltalk-implemented built-in module (math,
 operator, os.path) counts as importable exactly like a vendored .py does.
 Resolving anything less than that would have measured the search path rather
 than what Python code can actually use."
builtinsMod := importlib ___lookupModule___: 'builtins'.
builtinsMod isNil ifTrue: [
  out nextPutAll: 'CENSUS_FATAL|no builtins module instance'; lf.
  ExitClientError signal: 'no-builtins' status: 1].

(offset + 1) to: ((offset + limit) min: names size) do: [:i | | name |
  name := names at: i.
  out nextPutAll: 'CENSUS_PROBE|'; nextPutAll: name; lf; flush.
  [
    builtinsMod @env1:___import__: { name } kw: nil.
    out nextPutAll: 'CENSUS|'; nextPutAll: name; nextPutAll: '|IMPORTS|'; lf; flush.
  ] on: AbstractException do: [:ex | | cls msg |
    (ex isKindOf: ExitClientError) ifTrue: [ex pass].
    cls := [ex class name asString] on: AbstractException do: [:e2 | 'Error'].
    msg := [ex messageText] on: AbstractException do: [:e2 | nil].
    "ModuleNotFoundError is the ONE verdict that means `nothing to run yet' --
     Grail has no such module.  Every other exception means the module exists
     and its import BROKE, which is a different (and more interesting) piece of
     work, so the two are never merged."
    (cls = 'ModuleNotFoundError')
      ifTrue: [
        out nextPutAll: 'CENSUS|'; nextPutAll: name; nextPutAll: '|MISSING|';
            nextPutAll: (clean value: msg); lf; flush]
      ifFalse: [
        out nextPutAll: 'CENSUS|'; nextPutAll: name; nextPutAll: '|ERROR|';
            nextPutAll: (clean value: cls , ': ' , (msg ifNil: [''])); lf; flush]]].
out nextPutAll: 'CENSUS_DONE|'; lf; flush.
ExitClientError signal: 'done' status: 0.
%
logout
! Reachable only if the run aborted before its clean ExitClientError.
exit 1
