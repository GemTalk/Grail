output pushnew runAbortReimportTest.out
! file tests/scripts/runAbortReimportTest.gs
!
! An ABORT rolls the repository back but not the session: sys.modules is
! session-local and keeps every module imported before it, while the generated
! module class, its PythonModules registration, its registry entry and its
! source hash -- all written in the aborted transaction -- go away with it.
!
! The session used to go on serving the module from cache, and that was silent
! and it committed: instances built on the cache hit persisted a class NOTHING
! NAMED (the class rides in by reachability from the instance, the name a later
! import needs does not).  The next session's import rebuilt a DIFFERENT class,
! and the committed instances answered isinstance() False against it -- while
! continuing to work against their old one.
!
! docs/Persistent_Modules_and_Classes.md D9: a registry hit is a cache, not
! authority.  lookupModule: asks PythonModules whether the entry still stands;
! one the repository no longer names is unloaded and reported as a MISS, so the
! next statement re-imports cold and rebuilds class, registration and hash
! together in the transaction that is running now.
!
! This harness drives the whole path: import, abort, re-import, commit, and then
! a FRESH session asking the question that matters -- is the committed object an
! instance of the class this session just imported?
!
! Not an SUnit test: it needs two sessions and a commit, and SUnit runs in one
! session that must not commit.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! Session 1 -- import, abort, then commit an instance of the module's class.
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
| out evalPython failures check tmpDir fixturePath file registered oldClass |
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
failures := OrderedCollection new.
check := [:label :ok |
  ok
    ifTrue: [out nextPutAll: '  PASS  ', label; cr]
    ifFalse: [failures add: label. out nextPutAll: '  FAIL  ', label; cr]].
registered := [:nm |
  (importlib ___canonicalModules___ at: nm otherwise: nil) notNil].

"A fixture of our own, in this checkout's scratch directory (several
checkouts share the stone as different users, so /tmp/Grail<N> is per
checkout).  Written fresh each run: the source hash is the module's
identity, so a stale file from an earlier run would warm-bind instead of
exercising the cold path this test is about."
tmpDir := importlib grailTmpDir.
fixturePath := tmpDir , '/grail_abort_reimport_fixture.py'.
(GsFile existsOnServer: fixturePath) == true ifTrue: [
  GsFile removeServerFile: fixturePath].
file := GsFile open: fixturePath mode: 'wb' onClient: false.
file nextPutAll: 'class Gadget:
    def __init__(self, n):
        self.n = n
    def label(self):
        return "gadget-" + str(self.n)
'; close.

System abortTransaction.

"SELF-HEAL, and it MUST come before the snapshot.  If an earlier run died
between its import and session 2's cleanup, the canonical entry it committed
is still there -- and since the fixture source is byte-identical each run, the
next import is a cache HIT on a COMMITTED module, which an abort cannot
remove.  This script would then fail its second check from then on and could
never recover, because it dies before its own cleanup.  The convention comes
from runPersistentStateTest.gs / runCanonicalClassTest.gs."
importlib ___canonicalModules___
  removeKey: 'grail_abort_reimport_fixture' ifAbsent: [].
importlib ___canonicalModuleHashes___
  removeKey: 'grail_abort_reimport_fixture' ifAbsent: [].
PythonModules
  removeKey: (importlib ___asSmalltalkModuleName___: 'grail_abort_reimport_fixture') asSymbol
  ifAbsent: [].
System commit.

"Snapshot the registries + PythonModules BEFORE the import, so the cleanup
removes EXACTLY what this run added and leaves a standing framework
deployment alone."
UserGlobals at: #'Grail_abort_reimport_snap'
  put: importlib ___canonicalRegistrySnapshot___.

evalPython value: 'import sys
sys.path.append("' , tmpDir , '")
import grail_abort_reimport_fixture'.
check value: 'cold import registers the module'
  value: (registered value: 'grail_abort_reimport_fixture').
oldClass := (importlib @env1:lookupModule: 'grail_abort_reimport_fixture') class.

"The abort a developer actually performs: gemdb.abort(), gemdb.refresh(),
or a transaction block abandoned by an exception."
evalPython value: 'import gemdb
gemdb.abort()'.
check value: 'abort removed the registration'
  value: (registered value: 'grail_abort_reimport_fixture') not.
"The session must NOT go on serving the rolled-back module from cache: the
next import has to be cold.  It still answers, so nothing the developer is
doing breaks -- it answers from freshly built code."
check value: 'the module still works after the abort'
  value: (evalPython value: 'import grail_abort_reimport_fixture
grail_abort_reimport_fixture.Gadget(3).label()') = 'gadget-3'.

"The discriminating check, and the one that fails against the old build: a
cache hit would have handed back the SAME class the abort orphaned."
check value: 'the re-import minted a fresh class (the stale entry was unloaded)'
  value: ((importlib @env1:lookupModule: 'grail_abort_reimport_fixture') class ~~ oldClass).

"Now commit work that points at the module''s class."
evalPython value: 'import gemdb, grail_abort_reimport_fixture
gemdb.root["grail_abort_reimport_probe"] = grail_abort_reimport_fixture.Gadget(5)
gemdb.commit()'.
check value: 'the registration stands at the commit'
  value: (registered value: 'grail_abort_reimport_fixture').
"ifNil: [false], not a bare isCommitted: nil IS committed, so an ABSENT
entry passed this check while the one beside it failed."
check value: 'and the entry it persisted is committed'
  value: ((importlib ___canonicalModules___
    at: 'grail_abort_reimport_fixture' otherwise: nil)
      ifNil: [false] ifNotNil: [:m | m isCommitted]).
check value: 'and the hash came back with it'
  value: ((importlib ___canonicalModuleHashes___
    at: 'grail_abort_reimport_fixture' otherwise: nil) notNil).

out cr.
failures isEmpty ifFalse: [
  out nextPutAll: 'abort-reimport session-1 checks FAILED:'; cr.
  failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
  ExitClientError signal: 'abort-reimport test failed!' status: 1].
out nextPutAll: 'abort-reimport session 1: all checks passed.'; cr.
%
logout

! ===========================================================================
! Session 2 -- the question that matters, then clean up.
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
| out evalPython failures check tmpDir r |
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
failures := OrderedCollection new.
check := [:label :ok |
  ok
    ifTrue: [out nextPutAll: '  PASS  ', label; cr]
    ifFalse: [failures add: label. out nextPutAll: '  FAIL  ', label; cr]].
tmpDir := importlib grailTmpDir.

"Run inside ensure: so the committed key and the fixture's registration are
removed however this ends."
[
  check value: 'a fresh session sees the registration'
    value: ((importlib ___canonicalModules___
      at: 'grail_abort_reimport_fixture' otherwise: nil) notNil).

  "The committed object is readable either way -- it carries its class with
  it.  That is why the bug was silent."
  check value: 'the committed instance still works'
    value: (evalPython value: 'import gemdb
gemdb.root["grail_abort_reimport_probe"].label()') = 'gadget-5'.

  "The question: is it an instance of the class THIS session imports?"
  r := evalPython value: 'import sys, gemdb
sys.path.append("' , tmpDir , '")
import grail_abort_reimport_fixture as m
w = gemdb.root["grail_abort_reimport_probe"]
str(type(w) is m.Gadget) + ":" + str(isinstance(w, m.Gadget))'.
  check value: 'the committed instance IS an instance of the imported class'
    value: r = 'True:True'.

  "A warm bind of a committed module leaves nothing to commit."
  check value: 'binding the deployed module left the session clean'
    value: System needsCommit not.
] ensure: [
  evalPython value: 'import gemdb
gemdb.root.pop("grail_abort_reimport_probe", None)'.
  "Restore session 1's pre-import snapshot: it removes the canonical entries
  AND the PythonModules class this run added -- what makes the script
  idempotent -- while leaving a standing framework deployment, which predates
  the snapshot, alone."
  importlib ___canonicalRegistryRestore___:
    (UserGlobals at: #'Grail_abort_reimport_snap'
      ifAbsent: [importlib ___canonicalRegistrySnapshot___]).
  UserGlobals removeKey: #'Grail_abort_reimport_snap' ifAbsent: [].
  System commit.
  (GsFile existsOnServer: (tmpDir , '/grail_abort_reimport_fixture.py')) == true
    ifTrue: [GsFile removeServerFile: (tmpDir , '/grail_abort_reimport_fixture.py')]
].

out cr.
failures isEmpty
  ifTrue: [
    out nextPutAll: 'abort-reimport test: all checks passed.'; cr.
    ExitClientError signal: 'abort-reimport test passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'abort-reimport test FAILED:'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
    ExitClientError signal: 'abort-reimport test failed!' status: 1].
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report -- fail loudly instead of exit 0.
exit 1
