! file tests/scripts/runConcurrentImportRpc.gs
!
! Interleaved-commit concurrency test (docs/Persistent_Modules_and_Classes.md
! par.10.7 phase 8), RPC edition.  Unlike the two-topaz-process +
! marker-file version this drives TWO RPC SESSIONS from ONE topaz process and
! interleaves them DETERMINISTICALLY with ``set session:'' -- no polling, no
! sync files.  Needs a running NetLDI (the shell wrapper supplies the gemnetid
! and starts one in CI).
!
! Shape: session 1 preps (ensures the reduced-conflict registries exist,
! committed) then cold-imports module A flag-on WITHOUT committing; session 2
! -- whose transaction begins after the prep commit but before A's -- cold
! imports the DISJOINT module B flag-on WITHOUT committing; session 1 commits
! A (wins); session 2 commits B, which conflicts on the shared structures a
! concurrent cold import still touches (PythonModules), so it follows the
! GemStone protocol -- abort, refresh past A's commit, re-import B, re-commit
! -- and succeeds.  A final verify (fresh session) sees BOTH registry entries
! merged and warm-binds A's committed instance, then restores the snapshot.
!
! Env: GRAIL_DIR, GRAIL_CC_SYNC (dir holding grail_ccmod_a.py / _b.py, written
! by the wrapper).
set user DataCurator pass swordfish
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ---- Session 1: prep + cold-import A (uncommitted) --------------------------
login
run
| sync |
importlib grailDir: '@@GRAILDIR@@'.
sync := '@@SYNC@@'.
"Prep: snapshot, ensure registries exist committed (so the workers ADD to
existing reduced-conflict collections instead of racing to create them)."
UserGlobals at: #'Grail_ccrpc_snap' put: importlib ___canonicalRegistrySnapshot___.
importlib ___canonicalClassRegistry___.
importlib ___canonicalModules___.
importlib ___canonicalModuleHashes___.
(UserGlobals at: #'GrailCanonicalClassSet' ifAbsent: [nil]) isNil
  ifTrue: [UserGlobals at: #'GrailCanonicalClassSet' put: RcIdentityBag new].
System commitTransaction ifFalse: [^ self error: 'prep commit failed'].
"Cold-import A flag-on -- registry writes stay UNCOMMITTED in this session."
importlib ___canonicalClassesEnabled___: true.
importlib loadModuleFromPath: sync , '/grail_ccmod_a.py' name: 'grail_ccmod_a'.
GsFile stdout nextPutAll: 'S1: prepped + imported A (uncommitted)'; cr.
%

! ---- Session 2: cold-import B (uncommitted), overlapping S1's txn ----------
login
run
| sync |
importlib grailDir: '@@GRAILDIR@@'.
sync := '@@SYNC@@'.
importlib ___canonicalClassesEnabled___: true.
importlib loadModuleFromPath: sync , '/grail_ccmod_b.py' name: 'grail_ccmod_b'.
GsFile stdout nextPutAll: 'S2: imported B (uncommitted)'; cr.
%

! ---- Session 1 commits A (wins) -------------------------------------------
set session: 1
run
| ok |
ok := System commitTransaction.
GsFile stdout nextPutAll: 'S1: commit A -> '; print: ok; cr.
ok ifFalse: [^ self error: 'S1 commit A unexpectedly conflicted'].
%

! ---- Session 2 commits B (conflicts -> abort/retry -> wins) ---------------
set session: 2
run
| ok sync |
sync := '@@SYNC@@'.
ok := System commitTransaction.
GsFile stdout nextPutAll: 'S2: commit B -> '; print: ok; cr.
ok ifFalse: [
  "First-commit-wins: abort (refresh past A's commit), re-import B, re-commit."
  System abortTransaction.
  importlib loadModuleFromPath: sync , '/grail_ccmod_b.py' name: 'grail_ccmod_b'.
  ok := System commitTransaction.
  GsFile stdout nextPutAll: 'S2: RETRY commit B -> '; print: ok; cr].
ok ifFalse: [^ self error: 'S2 commit B failed even after retry'].
%

! ---- Fresh session: verify BOTH merged + warm-bind A, then clean up -------
login
run
| out sync failures check reg modA |
out := GsFile stdout.
importlib grailDir: '@@GRAILDIR@@'.
sync := '@@SYNC@@'.
failures := OrderedCollection new.
check := [:label :bool | bool ifFalse: [failures add: label]].
[
  importlib ___canonicalClassesEnabled___: true.
  reg := importlib ___canonicalModules___.
  check value: 'registry holds A' value: ((reg at: 'grail_ccmod_a' otherwise: nil) notNil).
  check value: 'registry holds B (MERGED)' value: ((reg at: 'grail_ccmod_b' otherwise: nil) notNil).
  check value: 'A committed' value: (((reg at: 'grail_ccmod_a' otherwise: nil) ifNil: [false] ifNotNil: [:m | m isCommitted])).
  check value: 'B committed' value: (((reg at: 'grail_ccmod_b' otherwise: nil) ifNil: [false] ifNotNil: [:m | m isCommitted])).
  modA := importlib loadModuleFromPath: sync , '/grail_ccmod_a.py' name: 'grail_ccmod_a'.
  check value: 'fresh session warm-binds A (identity)' value: (modA == (reg at: 'grail_ccmod_a' otherwise: nil)).
  check value: 'bound A answers its global' value: ((modA @env1:value) = 41).
] ensure: [
  importlib ___canonicalRegistryRestore___:
    (UserGlobals at: #'Grail_ccrpc_snap' ifAbsent: [importlib ___canonicalRegistrySnapshot___]).
  UserGlobals removeKey: #'Grail_ccrpc_snap' ifAbsent: [].
  System commitTransaction
].
failures isEmpty
  ifTrue: [
    out nextPutAll: 'Concurrent-import (RPC) regressions: all checks passed.'; cr.
    UserGlobals at: #'Grail_ccrpc_ok' put: true]
  ifFalse: [
    out nextPutAll: 'Concurrent-import (RPC) regressions FAILED:'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
    UserGlobals at: #'Grail_ccrpc_ok' put: false].
System commitTransaction.
%

! ---- Report verdict across all sessions, exit -----------------------------
run
| ok |
ok := UserGlobals at: #'Grail_ccrpc_ok' ifAbsent: [false].
UserGlobals removeKey: #'Grail_ccrpc_ok' ifAbsent: [].
System commitTransaction.
ok
  ifTrue: [ExitClientError signal: 'Concurrent-import RPC passed!' status: 0]
  ifFalse: [ExitClientError signal: 'Concurrent-import RPC failed!' status: 1].
%
exit 1
