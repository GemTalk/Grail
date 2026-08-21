output pushnew runGemdbTest.out
! file tests/scripts/runGemdbTest.gs
!
! Functional test for the gemdb module (src/python/stdlib/gemdb.py and the
! needs_commit / transaction_conflicts accessors in gemstone.gs) -- the
! public Python persistence API: gemdb.root, gemdb.transaction(),
! gemdb.commit()/abort()/refresh(), and their guard rails.
!
! This cannot be an SUnit test: SUnit runs in a single session and must not
! commit or abort.  Session 1 deploys gemdb (cold import + commit, matching
! how an image ships it), exercises the whole single-session surface, and
! leaves one committed value; session 2 verifies the headline properties a
! FRESH session must have -- import leaves nothing to commit, the committed
! value is there, abort discards an overwrite -- then removes the key and
! commits to leave the repository clean.
!
! The commit-conflict path needs a second concurrent session and lives in
! tests/scripts/run_gemdb_conflict_test.sh (RPC, like the concurrent-import
! test).
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! Session 1 -- deploy gemdb, exercise the single-session surface.
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
| out evalPython failures check r |
out := GsFile stdout.
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
failures := OrderedCollection new.
check := [:label :ok |
  ok
    ifTrue: [out nextPutAll: '  PASS  ', label; cr]
    ifFalse: [failures add: label. out nextPutAll: '  FAIL  ', label; cr]].

"Deploy: cold import + commit, the way an image ships gemdb.  On a rerun
this warm-binds and the commit is a no-op."
evalPython value: 'import gemdb'.
(System commitTransaction) ifFalse: [^ self error: 'gemdb deploy commit failed'].
check value: 'deployed import leaves session clean' value: System needsCommit not.

"root reads are empty-safe and leave nothing to commit."
r := evalPython value: '
import gemdb
str("gemdb_test_nope" in gemdb.root) + ":" + str(gemdb.root.get("gemdb_test_nope", 42))'.
check value: 'root reads are empty-safe' value: r = 'False:42'.
check value: 'root reads do not dirty the session' value: System needsCommit not.

"transaction block: write through root, committed on exit."
evalPython value: '
import gemdb
with gemdb.transaction():
    gemdb.root["gemdb_test"] = {"n": 1}
'.
check value: 'block exit committed' value: System needsCommit not.
check value: 'block write visible'
  value: (evalPython value: '
import gemdb
gemdb.root["gemdb_test"]["n"]
') = 1.

"an exception inside the block aborts and propagates."
r := evalPython value: '
import gemdb
try:
    with gemdb.transaction():
        gemdb.root["gemdb_test"]["n"] = 99
        raise RuntimeError("boom")
except RuntimeError:
    pass
gemdb.root["gemdb_test"]["n"]
'.
check value: 'exception aborted the block' value: r = 1.

"a dirty session refuses the block and keeps the pending change."
r := evalPython value: '
import gemdb
gemdb.root["gemdb_test"]["n"] = 7
try:
    with gemdb.transaction():
        pass
    r = "no error"
except gemdb.PendingChangesError:
    r = "raised"
r + ":" + str(gemdb.root["gemdb_test"]["n"])
'.
check value: 'dirty entry refused, pending change kept' value: r = 'raised:7'.

"refresh() refuses while dirty; abort() discards; refresh() then works."
r := evalPython value: '
import gemdb
try:
    gemdb.refresh()
    r = "no error"
except gemdb.PendingChangesError:
    r = "refused"
gemdb.abort()
gemdb.refresh()
r + ":" + str(gemdb.root["gemdb_test"]["n"])
'.
check value: 'refresh refuses dirt; abort restores committed state' value: r = 'refused:1'.

"blocks do not nest."
r := evalPython value: '
import gemdb
try:
    with gemdb.transaction():
        with gemdb.transaction():
            pass
    r = "no error"
except gemdb.GemDBError:
    r = "refused"
r'.
check value: 'nested block refused' value: r = 'refused'.

"explicit commit()/abort() inside a block are refused; the failed block
aborts and leaves the session clean."
r := evalPython value: '
import gemdb
try:
    with gemdb.transaction():
        gemdb.commit()
    r = "no error"
except gemdb.GemDBError:
    r = "refused"
r'.
check value: 'explicit commit inside block refused' value: r = 'refused'.
check value: 'refused block left session clean' value: System needsCommit not.

"decorator form: the function is one committed transaction."
r := evalPython value: '
import gemdb
@gemdb.transaction
def bump():
    gemdb.root["gemdb_test"]["n"] += 1
    return gemdb.root["gemdb_test"]["n"]
bump()'.
check value: 'decorator ran and committed' value: (r = 2 and: [System needsCommit not]).

"retries= is decorator-only."
r := evalPython value: '
import gemdb
try:
    with gemdb.transaction(retries=3):
        pass
    r = "no error"
except TypeError:
    r = "refused"
r'.
check value: 'with-form retries refused' value: r = 'refused'.

"explicit commit() persists; leave n = 5 for session 2."
evalPython value: '
import gemdb
gemdb.root["gemdb_test"]["n"] = 5
gemdb.commit()
'.
check value: 'explicit commit persisted'
  value: (evalPython value: '
import gemdb
gemdb.root["gemdb_test"]["n"]
') = 5.

out cr.
failures isEmpty ifFalse: [
  out nextPutAll: 'gemdb session-1 checks FAILED:'; cr.
  failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
  ExitClientError signal: 'gemdb test failed!' status: 1].
out nextPutAll: 'gemdb session 1: all checks passed.'; cr.
%
logout

! ===========================================================================
! Session 2 -- what a fresh session must see; clean up.
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
| out evalPython failures check r |
out := GsFile stdout.
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
failures := OrderedCollection new.
check := [:label :ok |
  ok
    ifTrue: [out nextPutAll: '  PASS  ', label; cr]
    ifFalse: [failures add: label. out nextPutAll: '  FAIL  ', label; cr]].

"Run inside ensure: so the committed key is removed in every case."
[
  "The headline property: importing gemdb in a fresh session leaves
  nothing to commit, so the first transaction block just works."
  evalPython value: 'import gemdb'.
  check value: 'fresh session: import leaves nothing to commit'
    value: System needsCommit not.

  check value: 'fresh session sees the committed value'
    value: (evalPython value: '
import gemdb
gemdb.root["gemdb_test"]["n"]
') = 5.

  "First block of the session works immediately."
  evalPython value: '
import gemdb
with gemdb.transaction():
    gemdb.root["gemdb_test"]["n"] = 6
'.
  check value: 'first block of a fresh session commits'
    value: (System needsCommit not and:
      [(evalPython value: '
import gemdb
gemdb.root["gemdb_test"]["n"]
') = 6]).

  "abort() discards an uncommitted overwrite."
  evalPython value: '
import gemdb
gemdb.root["gemdb_test"]["n"] = 9
'.
  r := evalPython value: '
import gemdb
gemdb.abort()
gemdb.root["gemdb_test"]["n"]
'.
  check value: 'abort discarded the uncommitted overwrite' value: r = 6.
] ensure: [
  evalPython value: '
import gemdb
gemdb.root.pop("gemdb_test", None)
'.
  System commit
].

out cr.
failures isEmpty
  ifTrue: [
    out nextPutAll: 'gemdb test: all checks passed.'; cr.
    ExitClientError signal: 'gemdb test passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'gemdb test FAILED:'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
    ExitClientError signal: 'gemdb test failed!' status: 1].
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report -- fail loudly instead of exit 0.
exit 1
