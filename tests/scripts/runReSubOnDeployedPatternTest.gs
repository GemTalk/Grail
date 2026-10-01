output pushnew runReSubOnDeployedPatternTest.out
! file tests/scripts/runReSubOnDeployedPatternTest.gs
!
! re.sub / subn / Match.expand with a callable or a template, on a pattern
! from a DEPLOYED module (#1253).
!
! Why a script: the failure needs a session that warm-binds the deployed module
! and has compiled no regex itself, so that re's submodules were never
! registered in it -- and the suite must not commit.
!
! WHAT IT GUARDS.  SrePattern's substitution path began by looking re._parser
! up BY NAME in the session's sys.modules, with no fallback and no import, so in
! exactly that session ``REFERENCE.sub(lambda m: 'X', s)'' was an uncatchable
! LookupError and the process ended; Match.expand did the same.  And
! ``callable'' was decided by class, so a callable instance, functools.partial,
! operator.itemgetter or a class had its repr spliced into the result as text.
!
! Session B first checks that re._parser is NOT registered: with it registered
! the first defect cannot show, and the check would pass for the wrong reason.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! Session A -- deploy
! ===========================================================================
login
run
| dir |
dir := importlib grailDir.
dir ifNotNil: [
  (System gemEnvironmentVariable: 'GRAIL_DIR') = dir ifFalse: [
    System gemEnvironmentVariable: 'GRAIL_DIR' put: dir]]
%
level 0
run
| out mod |
out := GsFile stdout.
UserGlobals at: #'Grail_resub_snap' put: importlib ___canonicalRegistrySnapshot___.
UserGlobals at: #'Grail_resub_failures' put: 999.
mod := importlib
    loadModuleFromPath: (importlib grailDir , '/tests/python/re_sub_on_deployed_pattern_fixture.py')
    name: 're_sub_on_deployed_pattern_fixture'.
UserGlobals at: #'Grail_resub_module' put: mod.
System commit.
out cr; nextPutAll: 'sessionA: fixture deployed (committed)'; cr.
%
logout

! ===========================================================================
! Session B -- a fresh session, warm-bound
! ===========================================================================
login
run
| dir |
dir := importlib grailDir.
dir ifNotNil: [
  (System gemEnvironmentVariable: 'GRAIL_DIR') = dir ifFalse: [
    System gemEnvironmentVariable: 'GRAIL_DIR' put: dir]]
%
level 0
run
| out mod failures check guarded |
out := GsFile stdout.
failures := OrderedCollection new.
check := [:label :bool | bool ifFalse: [failures add: label]].
[
  mod := importlib
    loadModuleFromPath: (importlib grailDir , '/tests/python/re_sub_on_deployed_pattern_fixture.py')
    name: 're_sub_on_deployed_pattern_fixture'.
  check value: 'B: warm-bound to the committed module'
        value: mod == (UserGlobals at: #'Grail_resub_module').
  "Each check carries its own handler, so the two defects are reported
  independently: an error in one must not hide the other."
  guarded := [:label :aBlock |
    check value: label value: ([aBlock value]
      @env0:on: AbstractException
      do: [:ex | failures add: label , ' raised ' , ex class name asString.
        ex @env0:return: true])].
  check value: 'B: precondition -- re._parser is not registered in this session'
        value: ((importlib @env1:modules) includesKey: #'re._parser') not.
  guarded value: 'B: every substitution shape on the deployed pattern'
        value: [((mod @env1:deployed_shapes) @env1:__repr__) asString
          = ((mod @env1:___pyAttrLoad___: #'DEPLOYED_SHAPES') @env1:__repr__) asString].
  "The callable check is about callability alone, so it runs with the parser
  registered -- otherwise a regression of the first defect would mask it."
  (importlib @env0:___instance___) @env1:import_module: 're._parser'.
  guarded value: 'B: a callable that is not a function is called'
        value: [((mod @env1:callable_shapes) @env1:__repr__) asString
          = ((mod @env1:___pyAttrLoad___: #'CALLABLE_SHAPES') @env1:__repr__) asString].
] @env0:on: AbstractException do: [:ex |
  failures add: 'B: raised ' , ex class name asString , ': ' ,
    ((ex messageText ifNil: ['']) asString copyFrom: 1
      to: (((ex messageText ifNil: ['']) asString size) min: 80)).
  ex @env0:return: nil].
System abort.
UserGlobals at: #'Grail_resub_failures' put: failures size.
failures do: [:f | out nextPutAll: 'FAIL '; nextPutAll: f; cr].
System commit.
out nextPutAll: 'sessionB: '; print: failures size; nextPutAll: ' failure(s)'; cr.
%
logout

! ===========================================================================
! Session C -- cleanup (always), then the verdict
! ===========================================================================
login
run
| out failCount |
out := GsFile stdout.
failCount := UserGlobals at: #'Grail_resub_failures' ifAbsent: [999].
System abort.
importlib ___canonicalRegistryRestore___:
  (UserGlobals at: #'Grail_resub_snap' ifAbsent: [importlib ___canonicalRegistrySnapshot___]).
UserGlobals removeKey: #'Grail_resub_snap' ifAbsent: [].
UserGlobals removeKey: #'Grail_resub_module' ifAbsent: [].
UserGlobals removeKey: #'Grail_resub_failures' ifAbsent: [].
UserGlobals removeKey: #'GrailPersistentModuleState' ifAbsent: [].
System commit.
failCount = 0
  ifTrue: [ExitClientError signal: 're.sub on a deployed pattern: all checks passed!' status: 0]
  ifFalse: [
    out nextPutAll: 're.sub on a deployed pattern had '; print: failCount;
      nextPutAll: ' failure(s) -- see above.'; cr.
    ExitClientError signal: 're.sub on a deployed pattern FAILED!' status: 1].
%
logout
