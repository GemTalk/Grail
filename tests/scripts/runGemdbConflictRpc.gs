! file tests/scripts/runGemdbConflictRpc.gs
!
! Commit-conflict test for the gemdb module: two RPC sessions in one topaz
! process, interleaved deterministically with ``set session:'' (same
! mechanism as runConcurrentImportRpc.gs; run via
! run_gemdb_conflict_test.sh, which substitutes @@GRAILDIR@@).
!
! Session 1 opens a gemdb.transaction() block and modifies a committed
! dict; session 2 modifies the same dict and commits first; session 1's
! block exit must then raise ConflictError with aborted=True and the live
! conflicting objects, leave the session clean, and see session 2's value
! after the abort.  A decorated retry then succeeds on top -- the
! abort/refresh/replay protocol expressed as @gemdb.transaction(retries=).
!
! The block is entered and exited in separate ``run'' blocks (__enter__ /
! __exit__ called explicitly, the transaction object parked in gemdb's
! session dict) because the interleave point must sit INSIDE the
! transaction, and a with statement cannot span two evaluations.
iferr 1 where
iferr 2 exit 1

! ---- Session 1: deploy gemdb, commit the shared dict, enter the block ----
login
run
| evalPython |
importlib grailDir: '@@GRAILDIR@@'.
importlib ___canonicalClassesEnabled___: true.
evalPython := [:src |
  | moduleScope scope module |
  moduleScope := SymbolDictionary new.
  scope := System myUserProfile symbolList copy.
  scope insertObject: moduleScope at: 1.
  module := ModuleAst parseSource: src.
  module useTempsForBlock: false.
  module ensureModuleScope: moduleScope.
  module evaluateWithScope: scope].
evalPython value: 'import gemdb'.
System commitTransaction ifFalse: [^ self error: 'S1: gemdb deploy commit failed'].
evalPython value: '
import gemdb
gemdb.root["gemdb_cc"] = {"n": 0}
gemdb.commit()
'.
"Enter the block and leave it open across run blocks: park the
transaction object in gemdb''s session-local dict."
evalPython value: '
import gemdb
t = gemdb.transaction()
t.__enter__()
gemdb.root["gemdb_cc"]["n"] = 1
gemdb._state()["cc_txn"] = t
'.
GsFile stdout nextPutAll: 'S1: block open, n=1 uncommitted'; cr.
%

! ---- Session 2: write the same dict and commit first (wins) --------------
login
run
| evalPython |
importlib grailDir: '@@GRAILDIR@@'.
importlib ___canonicalClassesEnabled___: true.
evalPython := [:src |
  | moduleScope scope module |
  moduleScope := SymbolDictionary new.
  scope := System myUserProfile symbolList copy.
  scope insertObject: moduleScope at: 1.
  module := ModuleAst parseSource: src.
  module useTempsForBlock: false.
  module ensureModuleScope: moduleScope.
  module evaluateWithScope: scope].
evalPython value: '
import gemdb
gemdb.root["gemdb_cc"]["n"] = 100
gemdb.commit()
'.
GsFile stdout nextPutAll: 'S2: committed n=100'; cr.
%

! ---- Session 1: block exit must conflict, abort, and stay usable ---------
set session: 1
run
| evalPython r failures check |
evalPython := [:src |
  | moduleScope scope module |
  moduleScope := SymbolDictionary new.
  scope := System myUserProfile symbolList copy.
  scope insertObject: moduleScope at: 1.
  module := ModuleAst parseSource: src.
  module useTempsForBlock: false.
  module ensureModuleScope: moduleScope.
  module evaluateWithScope: scope].
failures := OrderedCollection new.
check := [:label :ok |
  ok
    ifTrue: [GsFile stdout nextPutAll: '  PASS  ', label; cr]
    ifFalse: [failures add: label. GsFile stdout nextPutAll: '  FAIL  ', label; cr]].

r := evalPython value: '
import gemdb
t = gemdb._state().pop("cc_txn")
try:
    t.__exit__(None, None, None)
    r = "no error"
except gemdb.ConflictError as e:
    objs = any(isinstance(v, list) and v for v in e.conflicts.values())
    r = "conflict aborted=" + str(e.aborted) + " objects=" + str(objs)
r'.
check value: 'block exit raised ConflictError, aborted, with objects'
  value: r = 'conflict aborted=True objects=True'.
check value: 'failed block left the session clean' value: System needsCommit not.
check value: 'abort made the winning commit visible'
  value: (evalPython value: '
import gemdb
gemdb.root["gemdb_cc"]["n"]
') = 100.

"The retry idiom: a decorated function replays on conflict.  No live
contention here (the interleave point cannot sit inside one evaluation),
so this asserts the happy path of the same machinery the conflict above
would be retried through."
r := evalPython value: '
import gemdb
@gemdb.transaction(retries=2)
def bump():
    gemdb.root["gemdb_cc"]["n"] += 1
    return gemdb.root["gemdb_cc"]["n"]
bump()'.
check value: 'decorated retry form commits on top' value: r = 101.

failures isEmpty ifFalse: [
  GsFile stdout nextPutAll: 'gemdb conflict test FAILED (session 1 phase)'; cr.
  ExitClientError signal: 'gemdb conflict test failed!' status: 1].
%

! ---- Fresh session: verify the merge, clean up ---------------------------
login
run
| evalPython r ok |
importlib grailDir: '@@GRAILDIR@@'.
importlib ___canonicalClassesEnabled___: true.
evalPython := [:src |
  | moduleScope scope module |
  moduleScope := SymbolDictionary new.
  scope := System myUserProfile symbolList copy.
  scope insertObject: moduleScope at: 1.
  module := ModuleAst parseSource: src.
  module useTempsForBlock: false.
  module ensureModuleScope: moduleScope.
  module evaluateWithScope: scope].
ok := true.
[
  r := evalPython value: '
import gemdb
gemdb.root["gemdb_cc"]["n"]
'.
  r = 101 ifFalse: [ok := false].
] ensure: [
  evalPython value: '
import gemdb
gemdb.root.pop("gemdb_cc", None)
'.
  System commit
].
ok
  ifTrue: [
    GsFile stdout nextPutAll: 'gemdb conflict test: all checks passed.'; cr.
    ExitClientError signal: 'gemdb conflict test passed!' status: 0]
  ifFalse: [
    GsFile stdout nextPutAll: 'gemdb conflict test FAILED: fresh session saw '; cr.
    ExitClientError signal: 'gemdb conflict test failed!' status: 1].
%
logout
! Reachable only when the run aborted before its status report.
exit 1
