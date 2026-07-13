output pushnew runPersistentStateTest.out
! file tests/scripts/runPersistentStateTest.gs
!
! Phase-2 persistent-module-state regression
! (docs/Persistent_Modules_and_Classes.md par.6): the ``__persistent__ =
! [...]'' module marker.
!
! Why this lives outside the in-session SUnit suite: the contract is only
! observable across a commit + logout + login boundary, and the suite must
! not commit.
!
! Contract under test:
!   - a module global listed in ``__persistent__'' survives sessions: the
!     re-import runs the body (initializer resets the session binding), then
!     the sync pass REBINDS the global to the committed value;
!   - both flavors work: a REBOUND scalar flushed by gemstone.system.commit()
!     (the Python-visible commit is the write-through point) and an in-place
!     MUTATED collection (binding restored on import; the mutation is an
!     ordinary committed object write);
!   - unlisted globals stay session-local (the re-run initializer wins);
!   - a module with no ``__persistent__'' contributes nothing to the store.
!
! Session 2 ensure:-removes the store key and the temp module file so the
! repository is left clean even if any check fails.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! persistent-state: Session 1 -- import, mutate, python-commit
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
| out f mod registry ok |
out := GsFile stdout.
f := GsFile openWriteOnServer: '/tmp/grail_persist_state_test.py'.
f nextPutAll: 'counter = 0
registry = {}
scratch = "fresh"
__persistent__ = ["counter", "registry"]
'.
f close.
mod := importlib
  loadModuleFromPath: '/tmp/grail_persist_state_test.py'
  name: 'grail_persist_state_test'.
((mod @env1:counter) = 0)
  ifFalse: [^ self error: 'setup: counter should start 0'].

"Rebind the scalar (write-through happens at the python commit below) and
mutate the dict in place (ordinary object write)."
mod dynamicInstVarAt: #counter put: 5.
registry := mod @env1:registry.
registry @env1:__setitem__: 'k' _: 'v'.

"gemstone.system.commit() -- the Python-visible commit -- must flush the
rebound counter into the store, then commit everything."
ok := System @env1:commit.
(ok == true) ifFalse: [^ self error: 'setup: python commit failed'].
out cr; nextPutAll: 'session1: imported, mutated, python-committed'; cr.
%
logout

! ===========================================================================
! persistent-state: Session 2 -- fresh login, re-import, verify, clean up
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
| out results failures check mod store |
out := GsFile stdout.
results := OrderedCollection new.
failures := OrderedCollection new.
check := [:label :bool | bool ifTrue: [results add: label] ifFalse: [failures add: label]].

[
  mod := importlib
    loadModuleFromPath: '/tmp/grail_persist_state_test.py'
    name: 'grail_persist_state_test'.
  check value: 'rebound scalar survives (counter = 5, not the initializer 0)'
    value: ((mod @env1:counter) = 5).
  check value: 'mutated collection survives (registry[k] = v)'
    value: (((mod @env1:registry) @env1:__getitem__: 'k') = 'v').
  check value: 'unlisted global stays session-local (scratch = fresh)'
    value: ((mod @env1:scratch) = 'fresh').
  store := UserGlobals at: #'GrailPersistentModuleState' ifAbsent: [nil].
  check value: 'store holds only the declaring module'
    value: (store notNil and: [store size = 1
      and: [(store at: 'grail_persist_state_test' otherwise: nil) notNil]]).
] ensure: [
  UserGlobals removeKey: #'GrailPersistentModuleState' ifAbsent: [].
  "Session 1's commit swept the module class into the committed
  PythonModules dictionary -- remove it so the repository is left clean."
  PythonModules removeKey: #'Grail_persist_state_test' ifAbsent: [].
  GsFile removeServerFile: '/tmp/grail_persist_state_test.py'.
  System commit
].

out cr; cr.
failures isEmpty
  ifTrue: [
    out nextPutAll: 'Persistent-state regressions: all checks passed.'; cr.
    ExitClientError signal: 'Persistent-state regressions passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'Persistent-state regressions FAILED:'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
    ExitClientError signal: 'Persistent-state regressions failed!' status: 1].
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report -- fail loudly instead of exit 0.
exit 1
