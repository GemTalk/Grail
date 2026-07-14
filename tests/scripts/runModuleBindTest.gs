output pushnew runModuleBindTest.out
! file tests/scripts/runModuleBindTest.gs
!
! Phase-5 acceptance test (docs/Persistent_Modules_and_Classes.md par.10.6):
! a warm import BINDS the committed module instance -- the body never
! re-runs -- so definition-time wiring (@dataclass against its MISSING
! sentinel, @enum.global_enum name injection, decorator registrations) is
! never torn from the state it captured.  This is THE gate the canonical
! flag must pass before it could ever default on.
!
! Why outside the SUnit suite: observable only across a commit + logout +
! login boundary, and the suite must not commit.
!
! Session A (flag on): import the fixture (cold), verify it, mutate module
!   state post-import (events add: 'A'), build + mutate a Widget, commit.
!   The commit sweeps the canonical registries -- classes, hashes, and the
!   MODULE INSTANCES of the imported closure (fixture + dataclasses + ...).
! Session B (fresh login, flag on): import must warm-BIND the committed
!   instance (identity!); body did NOT re-run (events = ['boot', 'A']);
!   the committed Widget still works; a NEW Widget() built in B gets its
!   defaults (the MISSING-coherence discriminator); global_enum's injected
!   names resolve; the registry holds exactly the committed class.
!   Then importlib.reload() must be the explicit COLD path (re-executes on
!   the same instance, refreshing classes in place).  Finally the par.10.5
!   guard: del sys.modules + re-import of a DEPLOYED module raises
!   ImportError pointing at reload().
! Session C: cleanup -- remove the committed keys + the PythonModules
!   entries this test added (snapshot-diff), leaving the repository clean.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! Session A -- flag on, cold import, mutate, commit
! ===========================================================================
login
run
| dir |
(dir := System gemEnvironmentVariable: 'GRAIL_DIR') ifNil:[
  System gemEnvironmentVariable: 'GRAIL_DIR' put: (dir := GsFile serverCurrentDirectory)
].
importlib grailDir: dir
%
level 0
run
| out mod widgetCls w d |
out := GsFile stdout.
(importlib ___canonicalClassesEnabled___)
  ifTrue: [^ self error: 'setup: canonical-classes flag must default to OFF'].

"Snapshot PythonModules BEFORE any import so session C can remove exactly
the module classes this test's commit adds."
UserGlobals at: #'Grail_bind_pm_before' put: (PythonModules keys asArray).

importlib ___canonicalClassesEnabled___: true.
mod := importlib
  loadModuleFromPath: (importlib grailDir , '/tests/python/grail_module_bind_fixture.py')
  name: 'grail_module_bind_fixture'.

"Sanity before committing anything."
((mod @env1:injected_ok) == true)
  ifFalse: [^ self error: 'setup: global_enum injection failed cold'].
widgetCls := mod @env1:Widget.
d := widgetCls @env1:value: { } value: nil.
((d @env1:describe) = 'unnamed:0')
  ifFalse: [^ self error: 'setup: cold default Widget broken: ' , (d @env1:describe) printString].

"Session tier: the hook ran once after the cold body (0 + 1)."
((mod @env1:init_count) = 1)
  ifFalse: [^ self error: 'setup: __session_init__ did not run on cold import: ' , (mod @env1:init_count) printString].

"Phase 8: the shared registries must be reduced-conflict collections so
concurrent first importers of DIFFERENT modules merge instead of
conflicting at commit."
((importlib ___canonicalClassRegistry___) isKindOf: RcKeyValueDictionary)
  ifFalse: [^ self error: 'setup: class registry is not reduced-conflict'].
((importlib ___canonicalModules___) isKindOf: RcKeyValueDictionary)
  ifFalse: [^ self error: 'setup: module registry is not reduced-conflict'].
((importlib ___canonicalModuleHashes___) isKindOf: RcKeyValueDictionary)
  ifFalse: [^ self error: 'setup: hash registry is not reduced-conflict'].
((UserGlobals at: #'GrailCanonicalClassSet' ifAbsent: [nil]) isKindOf: RcIdentityBag)
  ifFalse: [^ self error: 'setup: canonical class set is not reduced-conflict'].

"Post-import module-state mutation: the bind-vs-re-run discriminator."
(mod @env1:events) @env1:append: 'A'.

"A committed instance with non-default state."
w := widgetCls @env1:value: { 'gizmo' } value: nil.
(w @env1:tags) @env1:append: 'x'.
(w @env1:tags) @env1:append: 'y'.
((w @env1:describe) = 'gizmo:2')
  ifFalse: [^ self error: 'setup: mutated Widget broken: ' , (w @env1:describe) printString].

UserGlobals at: #'Grail_bind_widget' put: w.
UserGlobals at: #'Grail_bind_module' put: mod.
System commit.
out cr; nextPutAll: 'sessionA: committed fixture module instance + Widget'; cr.
%
logout

! ===========================================================================
! Session B -- fresh login, warm-BIND + verify + reload-cold + guard
! ===========================================================================
login
run
| dir |
(dir := System gemEnvironmentVariable: 'GRAIL_DIR') ifNil:[
  System gemEnvironmentVariable: 'GRAIL_DIR' put: (dir := GsFile serverCurrentDirectory)
].
importlib grailDir: dir
%
level 0
run
| out results failures check mod committedMod w widgetCls fresh guardMsg reloadedEvents |
out := GsFile stdout.
results := OrderedCollection new.
failures := OrderedCollection new.
check := [:label :bool | bool ifTrue: [results add: label] ifFalse: [failures add: label]].

[
  importlib ___canonicalClassesEnabled___: true.
  committedMod := UserGlobals at: #'Grail_bind_module'.
  w := UserGlobals at: #'Grail_bind_widget'.

  mod := importlib
    loadModuleFromPath: (importlib grailDir , '/tests/python/grail_module_bind_fixture.py')
    name: 'grail_module_bind_fixture'.

  check value: 'WARM BIND: import returned the committed module instance (identity)'
    value: (mod == committedMod).
  check value: 'body did NOT re-run (events = [boot, A], len 2)'
    value: (((mod @env1:events) @env1:__len__) = 2).
  widgetCls := mod @env1:Widget.
  check value: 'committed Widget instance class == bound module Widget (isinstance holds)'
    value: ((w class) == widgetCls).
  check value: 'committed Widget still runs (describe = gizmo:2)'
    value: ((w @env1:describe) = 'gizmo:2').

  "THE hybrid discriminator: a NEW instance in this session exercises the
  synthesized __init__ against the field objects + MISSING sentinel the
  class captured at deploy time."
  fresh := widgetCls @env1:value: { } value: nil.
  check value: 'NEW Widget() in session B: defaults apply (describe = unnamed:0)'
    value: ((fresh @env1:describe) = 'unnamed:0').
  (fresh @env1:tags) @env1:append: 'z'.
  check value: 'default_factory per instance: fresh mutation does not touch committed instance'
    value: ((w @env1:describe) = 'gizmo:2').

  check value: 'global_enum injected names present without body re-run (injected_ok)'
    value: ((mod @env1:injected_ok) == true).
  check value: 'injected CRIMSON is Color.CRIMSON'
    value: ((mod @env1:___pyAttrLoad___: #'CRIMSON')
              == ((mod @env1:Color) @env1:___pyAttrLoad___: #'CRIMSON')).
  check value: 'decorator registry intact: REGISTRY[Widget.__name__] is the canonical class'
    value: (((mod @env1:REGISTRY) @env1:__getitem__: (widgetCls @env1:__name__)) == widgetCls).
  check value: 'decorator registry has exactly one entry'
    value: (((mod @env1:REGISTRY) @env1:__len__) = 1).

  "Session tier (par.10.4): the warm BIND ran __session_init__ exactly
  once -- the committed value was 1 (session A's cold run), so this
  session sees 2, session-locally (this session does not commit it)."
  check value: 'SESSION INIT: hook ran on warm bind (init_count = committed 1 + 1 = 2)'
    value: ((mod @env1:init_count) = 2).

  "reload() is the EXPLICIT re-execution path (par.10.5): body re-runs on
  the SAME instance (events rebinds to [boot]); the identity-reused classes
  are refreshed in place, and the closure's warm-bound dataclasses module
  supplies the SAME MISSING sentinel, so re-decoration stays coherent."
  (importlib @env1:instance) @env1:reload: mod.
  reloadedEvents := mod @env1:events.
  check value: 'reload: body re-ran on the same instance (events rebound to [boot])'
    value: ((reloadedEvents @env1:__len__) = 1).
  check value: 'reload: class identity preserved (Widget is same object)'
    value: ((mod @env1:Widget) == widgetCls).
  check value: 'reload: committed instance still works after in-place refresh'
    value: ((w @env1:describe) = 'gizmo:2').
  check value: 'reload: NEW Widget() after reload still gets defaults'
    value: (((widgetCls @env1:value: { } value: nil) @env1:describe) = 'unnamed:0').
  check value: 'reload: __session_init__ re-ran after the body (init_count = 0 + 1)'
    value: ((mod @env1:init_count) = 1).

  "par.10.5 guard: del sys.modules + re-import of a DEPLOYED module raises
  with instructions instead of silently binding stale-looking state."
  (importlib @env1:modules) removeKey: #'grail_module_bind_fixture' ifAbsent: [].
  guardMsg := nil.
  [importlib
      loadModuleFromPath: (importlib grailDir , '/tests/python/grail_module_bind_fixture.py')
      name: 'grail_module_bind_fixture']
    on: AbstractException
    do: [:e | guardMsg := e messageText. e return: nil].
  out nextPutAll: 'guardMsg: '; nextPutAll: guardMsg printString; cr.
  check value: 'GUARD: delete-and-reimport raised'
    value: (guardMsg notNil).
  check value: 'GUARD: message names the condition (canonical (deployed))'
    value: (guardMsg notNil and: [(guardMsg includesString: 'canonical (deployed)')]).
  check value: 'GUARD: message points at importlib.reload()'
    value: (guardMsg notNil and: [(guardMsg includesString: 'importlib.reload()')]).
] on: AbstractException do: [:e |
  failures add: 'UNEXPECTED ERROR: ' , e messageText printString.
  e return: nil].

out cr; cr.
failures isEmpty
  ifTrue: [out nextPutAll: 'Module-bind acceptance (phase 5): all checks passed.'; cr]
  ifFalse: [
    out nextPutAll: 'Module-bind acceptance (phase 5) FAILED:'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr]].
UserGlobals at: #'Grail_bind_failures' put: failures size.
System commit.
%
logout

! ===========================================================================
! Session C -- cleanup (always), then report the recorded verdict
! ===========================================================================
login
run
| out failCount before |
out := GsFile stdout.
failCount := UserGlobals at: #'Grail_bind_failures' ifAbsent: [999].

"Remove everything session A's commit swept: the test keys, the canonical
registries (classes, hashes, class set, MODULE INSTANCES), and the module
classes added to PythonModules (snapshot-diff)."
before := UserGlobals at: #'Grail_bind_pm_before' ifAbsent: [PythonModules keys asArray].
PythonModules keys do: [:k |
  (before includes: k) ifFalse: [PythonModules removeKey: k ifAbsent: []]].
UserGlobals removeKey: #'Grail_bind_pm_before' ifAbsent: [].
UserGlobals removeKey: #'Grail_bind_widget' ifAbsent: [].
UserGlobals removeKey: #'Grail_bind_module' ifAbsent: [].
UserGlobals removeKey: #'Grail_bind_failures' ifAbsent: [].
UserGlobals removeKey: #'GrailCanonicalClasses' ifAbsent: [].
UserGlobals removeKey: #'GrailCanonicalClassSet' ifAbsent: [].
UserGlobals removeKey: #'GrailCanonicalModuleHashes' ifAbsent: [].
UserGlobals removeKey: #'GrailCanonicalModules' ifAbsent: [].
UserGlobals removeKey: #'GrailPersistentModuleState' ifAbsent: [].
System commit.

failCount = 0
  ifTrue: [ExitClientError signal: 'Module-bind acceptance passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'Module-bind acceptance had '; print: failCount;
      nextPutAll: ' failure(s) -- see session B output above.'; cr.
    ExitClientError signal: 'Module-bind acceptance failed!' status: 1].
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report -- fail loudly instead of exit 0.
exit 1
