! file tests/scripts/runConcurrentImportRpc.gs
!
! Interleaved-commit concurrency test (docs/Persistent_Modules_and_Classes.md
! par.10.7 phase 8), RPC edition.  Unlike the two-topaz-process +
! marker-file version this drives TWO RPC SESSIONS from ONE topaz process and
! interleaves them DETERMINISTICALLY with ``set session:'' -- no polling, no
! sync files.  Needs a running NetLDI (the shell wrapper supplies the gemnetid
! and starts one in CI).
!
! PHASE 1 -- DISJOINT modules.  Session 1 preps (ensures the reduced-conflict
! registries exist, committed) then cold-imports module A WITHOUT committing;
! session 2 -- whose transaction begins after the prep commit but before A's --
! cold imports the DISJOINT module B WITHOUT committing; session 1 commits A
! (wins); session 2 commits B, which conflicts on the shared structures a
! concurrent cold import still touches (PythonModules), so it follows the
! GemStone protocol -- abort, refresh past A's commit, re-import B, re-commit --
! and succeeds.  A verify session sees BOTH registry entries merged and
! warm-binds A's committed instance.
!
! PHASE 2 -- the SAME module, which was out of scope while a deploy was a
! separate step one session performed.  It is not: any session that imports and
! commits publishes (par.4.2), so two sessions racing to first-import one module
! is ordinary.  Both compile their OWN class into PythonModules under the same
! key; the winner commits; the loser's commit conflicts, and what it does next
! is the point.  Its own class is now an orphan the repository never accepted,
! and its sys.modules entry still points at it -- so the retry has to end up on
! the WINNER's class.  par.D9 is what makes that happen: the registry hit is
! validated against PythonModules, the stale entry is unloaded, and the
! re-import warm-BINDS the committed instance, compiling nothing.  The instance
! the loser then commits must be an instance of the class a fresh session
! imports; before D9 it was an instance of the orphan, and answered isinstance()
! False in the next session while continuing to work in its own.
!
! Env: GRAIL_DIR, GRAIL_CC_SYNC (dir holding grail_ccmod_a.py / _b.py and
! grail_ccsame.py, written by the wrapper).
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ---- PHASE 1, session 1: prep + cold-import A (uncommitted) -----------------
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
importlib loadModuleFromPath: sync , '/grail_ccmod_a.py' name: 'grail_ccmod_a'.
GsFile stdout nextPutAll: 'S1: prepped + imported A (uncommitted)'; cr.
%

! ---- PHASE 1, session 2: cold-import B (uncommitted), overlapping S1's txn --
login
run
| sync |
importlib grailDir: '@@GRAILDIR@@'.
sync := '@@SYNC@@'.
importlib loadModuleFromPath: sync , '/grail_ccmod_b.py' name: 'grail_ccmod_b'.
GsFile stdout nextPutAll: 'S2: imported B (uncommitted)'; cr.
%

! ---- PHASE 1: session 1 commits A (wins) ----------------------------------
set session: 1
run
| ok |
ok := System commitTransaction.
GsFile stdout nextPutAll: 'S1: commit A -> '; print: ok; cr.
ok ifFalse: [^ self error: 'S1 commit A unexpectedly conflicted'].
%

! ---- PHASE 1: session 2 commits B (conflicts -> abort/retry -> wins) ------
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

! ---- PHASE 1 verify (session 3): BOTH merged + warm-bind A, then clean up -
login
run
| out sync failures check reg modA |
out := GsFile stdout.
importlib grailDir: '@@GRAILDIR@@'.
sync := '@@SYNC@@'.
failures := OrderedCollection new.
check := [:label :bool | bool ifFalse: [failures add: label]].
[
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
  System commit .
].
failures isEmpty
  ifTrue: [
    out nextPutAll: 'Concurrent-import (RPC) regressions: all checks passed.'; cr.
    UserGlobals at: #'Grail_ccrpc_ok' put: true]
  ifFalse: [
    out nextPutAll: 'Concurrent-import (RPC) regressions FAILED:'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
    UserGlobals at: #'Grail_ccrpc_ok' put: false].
System commit.
%

! ===========================================================================
! PHASE 2 -- two sessions cold-import the SAME module.  The loser of the race
! must converge on the winner's class (par.D9), not on the orphan it compiled.
! ===========================================================================

! ---- PHASE 2, session 4 (the winner): prep + cold import, uncommitted ------
login
run
| sync |
importlib grailDir: '@@GRAILDIR@@'.
sync := '@@SYNC@@'.
"SELF-HEAL before the snapshot, the runPersistentStateTest.gs convention: a run
that died between its import and the cleanup left a COMMITTED entry, and since
the fixture source is byte-identical every run the next import would be a warm
BIND -- no race, no conflict, and two checks below passing vacuously."
importlib ___canonicalModules___ removeKey: 'grail_ccsame' ifAbsent: [].
importlib ___canonicalModuleHashes___ removeKey: 'grail_ccsame' ifAbsent: [].
PythonModules removeKey: #'grail_ccsame' ifAbsent: [].
UserGlobals removeKey: #'Grail_ccsame_probe' ifAbsent: [].
System commitTransaction ifFalse: [^ self error: 'phase 2 self-heal commit failed'].
UserGlobals at: #'Grail_ccsame_snap' put: importlib ___canonicalRegistrySnapshot___.
System commitTransaction ifFalse: [^ self error: 'phase 2 snapshot commit failed'].
importlib loadModuleFromPath: sync , '/grail_ccsame.py' name: 'grail_ccsame'.
GsFile stdout nextPutAll: 'S4: imported grail_ccsame cold (uncommitted), class oop ';
  print: (importlib @env1:lookupModule: 'grail_ccsame') class asOop; cr.
%

! ---- PHASE 2, session 5 (the loser): the same module, own class ------------
login
run
| sync |
importlib grailDir: '@@GRAILDIR@@'.
sync := '@@SYNC@@'.
importlib loadModuleFromPath: sync , '/grail_ccsame.py' name: 'grail_ccsame'.
"A DIFFERENT class object: each session compiled its own into its own
transaction.  Printed rather than asserted here -- the two oops live in
different sessions, and the assertion that matters (the loser ends up on the
committed one) is made below, where both are visible at once."
GsFile stdout nextPutAll: 'S5: imported grail_ccsame cold (uncommitted), class oop ';
  print: (importlib @env1:lookupModule: 'grail_ccsame') class asOop; cr.
%

! ---- PHASE 2: the winner commits ------------------------------------------
set session: 4
run
| ok |
ok := System commitTransaction.
GsFile stdout nextPutAll: 'S4: commit -> '; print: ok; cr.
ok ifFalse: [^ self error: 'S4 (winner) commit unexpectedly conflicted'].
%

! ---- PHASE 2: the loser conflicts, then must converge ---------------------
set session: 5
run
| out sync ok failures check mine mineMarker bound committedClass committedMarker ev widget |
out := GsFile stdout.
sync := '@@SYNC@@'.
failures := OrderedCollection new.
check := [:label :bool | bool ifFalse: [failures add: label]].
"An ``import'' the way application code spells it, through __import__ ->
lookupModule:.  The harness's own loadModuleFromPath: is a DIFFERENT route: it
consults the committed registry and the source hash, never sys.modules, so it
converges on the winner's class with or without par.D9.  The route a real
session takes is the one that has to be checked."
ev := [:src |
  | moduleScope scope module |
  moduleScope := SymbolDictionary new.
  scope := System myUserProfile symbolList copy.
  scope insertObject: moduleScope at: 1.
  module := ModuleAst parseSource: src.
  module useTempsForBlock: false.
  module ensureModuleScope: moduleScope.
  module evaluateWithScope: scope].
mine := (importlib @env1:lookupModule: 'grail_ccsame') class.
"The orphan's USER class as well as its module class: the instance a call
produces is an instance of ``Marker'', so that is the identity the checks below
have to compare.  Comparing against the MODULE class instead fails for a
trivial reason and looks like the real one -- it did, the first time."
mineMarker := (importlib @env1:lookupModule: 'grail_ccsame') @env1:Marker.
ok := System commitTransaction.
out nextPutAll: 'S5: commit -> '; print: ok; cr.
"The race has to be real.  Both sessions wrote the same PythonModules key in
overlapping transactions, so the loser MUST be refused -- if this ever answers
true the interleaving stopped working and every check after it is vacuous."
check value: 'the loser''s commit conflicts (the race is real)' value: (ok == false).
System abortTransaction.
"par.D9 in a race: the abort took the loser's class registration with it, and
its sys.modules entry outlives the abort -- so the lookup must now report a
MISS rather than serving the orphan."
check value: 'after the abort the stale entry is gone from sys.modules'
  value: ((importlib @env1:lookupModule: 'grail_ccsame') isNil).
committedClass := PythonModules at: #'grail_ccsame' otherwise: nil.
committedMarker := (importlib ___canonicalModules___ at: 'grail_ccsame' otherwise: nil)
  ifNil: [nil] ifNotNil: [:m | m @env1:Marker].
check value: 'the winner''s module is in the registry, committed'
  value: ((importlib ___canonicalModules___ at: 'grail_ccsame' otherwise: nil)
    ifNil: [false] ifNotNil: [:m | m isCommitted]).
"THE DISCRIMINATING CHECK.  A plain ``import'' plus a call: without par.D9 the
import is an ordinary cache hit on the orphan and this instance is an instance
of a class the repository never accepted -- which is how the bug used to reach
committed data."
widget := ev value: 'import sys
sys.path.append("' , sync , '")
import grail_ccsame
grail_ccsame.make()'.
check value: 'an ``import'' after the lost race yields the WINNER''s class'
  value: (committedMarker notNil and: [widget class == committedMarker]).
check value: 'and NOT the orphan this session compiled'
  value: (widget class ~~ mineMarker).
"The harness route, kept because it pins the other half of the contract: same
source, so the hash matches what the winner committed, and a warm BIND must
compile nothing."
bound := importlib loadModuleFromPath: sync , '/grail_ccsame.py' name: 'grail_ccsame'.
check value: 'loadModuleFromPath: binds the committed instance'
  value: (bound class == committedClass).
check value: 'the bound class is committed' value: (bound class isCommitted).
check value: 'the bound module answers its global' value: ((bound @env1:value) = 41).
"Now commit work that points at the class -- the step that used to persist an
instance of a class nothing named.  The instance is the one the PYTHON import
produced, so what a fresh session checks below is what an application would
actually have committed."
UserGlobals at: #'Grail_ccsame_probe' put: widget.
ok := System commitTransaction.
check value: 'committing an instance succeeds' value: (ok == true).
UserGlobals at: #'Grail_ccsame_loser_ok' put: failures isEmpty.
failures isEmpty ifFalse: [
  out nextPutAll: 'PHASE 2 (loser) FAILED:'; cr.
  failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr]].
System commitTransaction.
%

! ---- PHASE 2 verify (session 6): a FRESH session asks the real question ---
login
run
| out sync failures check m w |
out := GsFile stdout.
importlib grailDir: '@@GRAILDIR@@'.
sync := '@@SYNC@@'.
failures := OrderedCollection new.
check := [:label :bool | bool ifFalse: [failures add: label]].
[
  m := importlib loadModuleFromPath: sync , '/grail_ccsame.py' name: 'grail_ccsame'.
  w := UserGlobals at: #'Grail_ccsame_probe' ifAbsent: [nil].
  check value: 'the committed instance is there' value: (w notNil).
  "The question the orphan bug answered False, silently."
  check value: 'the committed instance IS an instance of the imported class'
    value: (w notNil and: [w class == (m @env1:Marker)]).
  check value: 'and it still works' value: (w notNil and: [(w @env1:tag) = 'same']).
  check value: 'the loser''s own checks passed'
    value: ((UserGlobals at: #'Grail_ccsame_loser_ok' ifAbsent: [false]) == true).
] ensure: [
  UserGlobals removeKey: #'Grail_ccsame_probe' ifAbsent: [].
  UserGlobals removeKey: #'Grail_ccsame_loser_ok' ifAbsent: [].
  importlib ___canonicalRegistryRestore___:
    (UserGlobals at: #'Grail_ccsame_snap' ifAbsent: [importlib ___canonicalRegistrySnapshot___]).
  UserGlobals removeKey: #'Grail_ccsame_snap' ifAbsent: [].
  System commit].
failures isEmpty
  ifTrue: [
    out nextPutAll: 'Same-module race: all checks passed.'; cr.
    UserGlobals at: #'Grail_ccsame_ok' put: true]
  ifFalse: [
    out nextPutAll: 'Same-module race FAILED:'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
    UserGlobals at: #'Grail_ccsame_ok' put: false].
System commit.
%

! ---- Report verdict across all sessions, exit -----------------------------
run
| ok1 ok2 |
ok1 := UserGlobals at: #'Grail_ccrpc_ok' ifAbsent: [false].
ok2 := UserGlobals at: #'Grail_ccsame_ok' ifAbsent: [false].
UserGlobals removeKey: #'Grail_ccrpc_ok' ifAbsent: [].
UserGlobals removeKey: #'Grail_ccsame_ok' ifAbsent: [].
System commit .
"Both phases, and ifAbsent: [false] on each: a phase that died before writing
its flag must fail the run rather than be read as silence."
(ok1 and: [ok2])
  ifTrue: [ExitClientError signal: 'Concurrent-import RPC passed!' status: 0]
  ifFalse: [ExitClientError signal: 'Concurrent-import RPC failed!' status: 1].
%
exit 1
