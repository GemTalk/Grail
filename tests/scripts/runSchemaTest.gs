output pushnew runSchemaTest.out
! file tests/scripts/runSchemaTest.gs
!
! Functional test for gemdb.schema (src/python/stdlib/gemdb/schema.py, the
! object class >> ___grail*Slot*___ primitives and Repository >>
! schema_report) -- the public Python surface for deliberate schema change:
! layout(), report(), drop(), rename() and compact().
!
! This cannot be an SUnit test.  Every operation but layout() scans the
! repository for the instances it touches, every such scan aborts the
! transaction first, and the operations commit themselves -- so they need a
! clean transaction and a session that may commit, which SUnit is not.
! IndexedSlotRebuildTestCase covers the same primitives over the
! session-only entry points.
!
! Session 1 deploys a two-class fixture module through gemdb.root, commits
! instances of both, re-imports a revision that stops assigning two of the
! attributes, and then drives the whole Python surface: the layout report's
! three kinds, the repository report's holding counts, a batched drop, a
! free relabel-rename, and a compaction.  Session 2 logs in fresh, faults
! the instances back through their root keys alone, checks what survived,
! and leaves the repository clean.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! Session 1 -- deploy the fixture, then drive gemdb.schema.
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
| out evalPython failures check noteAndClean path modName f r |
out := GsFile stdout.
failures := OrderedCollection new.
check := [:label :ok |
  ok
    ifTrue: [out nextPutAll: '  PASS  ', label; cr]
    ifFalse: [failures add: label. out nextPutAll: '  FAIL  ', label; cr]].
"Every scanning operation needs a clean transaction, which is what the
documented workflow does (``gemdb.commit()'', then call).  This says whether
the step before it left anything, so a surprise is reported rather than
silently committed -- and then commits, so the next step tests what it means
to."
noteAndClean := [:label |
  System needsCommit ifTrue: [
    out nextPutAll: '  NOTE  ' , label , ' left the session dirty'; cr].
  System commitTransaction ifFalse: [self error: 'the ' , label , ' commit failed']].
evalPython := [:src |
  | moduleScope scope module |
  moduleScope := SymbolDictionary new.
  scope := System myUserProfile symbolList copy.
  scope insertObject: moduleScope at: 1.
  module := ModuleAst parseSource: src.
  module useTempsForBlock: false.
  module ensureModuleScope: moduleScope.
  module evaluateWithScope: scope].

"Per-user path and module name: several worktrees share /tmp on one machine,
and a class outlives PythonModules (the canonical registry keeps it), so a
name another run left behind would start from that run's layout."
modName := 'grail_schema_' , System myUserProfile userId asString.
path := '/tmp/' , modName , '.py'.
UserGlobals at: #'Grail_schema_snap' put: importlib ___canonicalRegistrySnapshot___.
UserGlobals at: #'Grail_schema_path' put: path.
UserGlobals at: #'Grail_schema_mod' put: modName.

"Revision 1: A assigns x, y and z; B(A) adds b1.  The fixture stashes the
classes and one instance of each in gemdb.root, so the Python snippets below
-- and session 2 -- reach them by key rather than through sys.modules."
f := GsFile openWriteOnServer: path.
f nextPutAll: 'import gemdb


class A:
    def __init__(self):
        self.x = 1
        self.y = 2
        self.z = 3


class B(A):
    def __init__(self):
        super().__init__()
        self.b1 = 7


gemdb.root["grail_schema_A"] = A
gemdb.root["grail_schema_B"] = B
gemdb.root["grail_schema_a"] = A()
gemdb.root["grail_schema_b"] = B()
'.
f close.
(importlib @env1:modules) removeKey: modName asSymbol ifAbsent: [].
importlib loadModuleFromPath: path name: modName.
System commitTransaction ifFalse: [^ self error: 'setup: the fixture commit failed'].

[
"1. layout() -- every position assigned, and it needs no clean transaction."
r := evalPython value: '
import gemdb, gemdb.schema
A = gemdb.root["grail_schema_A"]
rows = gemdb.schema.layout(A)
":".join(r["name"] + "/" + str(r["position"]) + "/" + r["kind"] for r in rows)
'.
check value: 'layout() reports every position, assigned, in order'
  value: r = 'x/1/assigned:y/2/assigned:z/3/assigned'.
"Does layout() ITSELF dirty the session?  Commit first, so what is measured
is this call and not whatever the session did before it -- the FIRST Python
evaluation of a session can have work of its own to commit, and whether it
does is runGemdbTest.gs's install-contract check, not this one."
System commitTransaction.
evalPython value: '
import gemdb, gemdb.schema
gemdb.schema.layout(gemdb.root["grail_schema_A"])
'.
check value: 'layout() itself leaves the session clean' value: System needsCommit not.

r := evalPython value: '
import gemdb, gemdb.schema
B = gemdb.root["grail_schema_B"]
":".join(r["name"] for r in gemdb.schema.layout(B))
'.
check value: 'a subclass layout continues its parent''s' value: r = 'x:y:z:b1'.

"2. Revision 2 stops assigning x and z.  Nothing is retired: both survive,
the instances keep their values, and layout() now calls them unassigned."
f := GsFile openWriteOnServer: path.
f nextPutAll: 'import gemdb


class A:
    def __init__(self):
        self.y = 2


class B(A):
    def __init__(self):
        super().__init__()
        self.b1 = 7
'.
f close.
(importlib @env1:modules) removeKey: modName asSymbol ifAbsent: [].
importlib loadModuleFromPath: path name: modName.
System commitTransaction ifFalse: [^ self error: 'the revision-2 commit failed'].

r := evalPython value: '
import gemdb, gemdb.schema
A = gemdb.root["grail_schema_A"]
a = gemdb.root["grail_schema_a"]
rows = gemdb.schema.layout(A)
":".join(r["name"] + "/" + r["kind"] for r in rows) + " " + str(a.x) + "," + str(a.z)
'.
check value: 'an unassigned name keeps its position, its kind says so, its value reads'
  value: r = 'x/unassigned:y/assigned:z/unassigned 1,3'.
noteAndClean value: 'reading an unassigned attribute'.

"3. report() -- the repository-wide view, with the holding counts that are
the basis for deciding a drop.  A''s row counts A''s OWN instances (1), B''s
counts B''s (1)."
r := evalPython value: '
import gemdb, gemdb.schema
gemdb.commit()
rows = [r for r in gemdb.schema.report() if "grail_schema" in r["class"]]
rows.sort(key=lambda r: r["class"])
";".join(r["class"].split(".")[-1] + "=" + str(r["instances"]) + "[" +
         ",".join(a["name"] + "/" + a["kind"] + "/" + str(a["holding"])
                  for a in r["attributes"]) + "]"
         for r in rows)
'.
check value: 'report() names the classes, their instance counts and what each unassigned name still holds'
  value: r = 'A=1[x/unassigned/1,z/unassigned/1];B=1[x/unassigned/1,z/unassigned/1]'.

noteAndClean value: 'report()'.

"4. A dirty session is refused, by every operation that scans.  The write
that dirties it is INSIDE this snippet, after the compile, so what is being
tested is the refusal and not some incidental dirt."
r := evalPython value: '
import gemdb, gemdb.schema
A = gemdb.root["grail_schema_A"]
gemdb.commit()
gemdb.root["grail_schema_dirt"] = 1
out = []
for f in (lambda: gemdb.schema.report(),
          lambda: gemdb.schema.drop(A, "x"),
          lambda: gemdb.schema.rename(A, "z", "zz"),
          lambda: gemdb.schema.compact(A)):
    try:
        f()
        out.append("ran")
    except gemdb.PendingChangesError:
        out.append("refused")
",".join(out)
'.
check value: 'report/drop/rename/compact all refuse in a dirty session'
  value: r = 'refused,refused,refused,refused'.
evalPython value: '
import gemdb
gemdb.root.pop("grail_schema_dirt", None)
gemdb.commit()
'.

"5. drop() -- refused while a body still assigns the name, then the real
thing: every instance nilled, the position a hole, the name unknown."
r := evalPython value: '
import gemdb, gemdb.schema
A = gemdb.root["grail_schema_A"]
gemdb.commit()
try:
    gemdb.schema.drop(A, "y")
    verdict = "ran"
except ValueError:
    verdict = "refused"
verdict
'.
check value: 'drop() refuses a still-assigned name, as a catchable ValueError'
  value: r = 'refused'.
noteAndClean value: 'the refused drop'.

r := evalPython value: '
import gemdb, gemdb.schema
A = gemdb.root["grail_schema_A"]
a = gemdb.root["grail_schema_a"]
b = gemdb.root["grail_schema_b"]
gemdb.commit()
res = gemdb.schema.drop(A, "x", batch=1)
rows = gemdb.schema.layout(A)
kinds = ":".join(r["name"] + "/" + r["kind"] for r in rows)
gone = not hasattr(a, "x") and not hasattr(b, "x") and "x" not in vars(a)
str(res["classes"]) + "," + str(res["instances"]) + " " + kinds + " " + str(gone)
'.
check value: 'drop() clears every instance in the subtree and leaves a hole'
  value: r = '2,2 x/hole:y/assigned:z/unassigned True'.
check value: 'drop() committed itself' value: System needsCommit not.
noteAndClean value: 'drop()'.

"6. rename() -- z is unassigned and zz is nowhere, so this is the free
relabel: the position keeps its data and changes its name, no instance
touched."
r := evalPython value: '
import gemdb, gemdb.schema
A = gemdb.root["grail_schema_A"]
a = gemdb.root["grail_schema_a"]
b = gemdb.root["grail_schema_b"]
gemdb.commit()
res = gemdb.schema.rename(A, "z", "zz")
kinds = ":".join(r["name"] + "/" + r["kind"] for r in gemdb.schema.layout(A))
str(res["classes"]) + "," + str(res["instances"]) + " " + kinds + " " + \
    str(a.zz) + "," + str(b.zz) + " " + str(hasattr(a, "z"))
'.
check value: 'rename() relabels the position in place, moving nothing'
  value: r = '2,0 x/hole:y/assigned:zz/unassigned 3,3 False'.
check value: 'a relabel leaves nothing uncommitted of its own' value: System needsCommit not.
noteAndClean value: 'rename()'.

"7. compact() -- the hole goes, everything below it moves up one."
r := evalPython value: '
import gemdb, gemdb.schema
A = gemdb.root["grail_schema_A"]
B = gemdb.root["grail_schema_B"]
a = gemdb.root["grail_schema_a"]
b = gemdb.root["grail_schema_b"]
gemdb.commit()
res = gemdb.schema.compact(A)
la = ":".join(r["name"] for r in gemdb.schema.layout(A))
lb = ":".join(r["name"] for r in gemdb.schema.layout(B))
str(res["classes"]) + " " + la + " " + lb + " " + \
    str(a.y) + "," + str(a.zz) + "," + str(b.b1)
'.
check value: 'compact() frees the hole across the subtree and moves every value'
  value: r = '2 y:zz y:zz:b1 2,3,7'.
check value: 'compact() committed itself' value: System needsCommit not.
] ensure: [
  evalPython value: '
import gemdb
for k in ("grail_schema_A", "grail_schema_B", "grail_schema_a",
          "grail_schema_b", "grail_schema_dirt"):
    gemdb.root.pop(k, None)
gemdb.commit()
'.
  System commit
].

out cr.
failures isEmpty
  ifTrue: [
    out nextPutAll: 'gemdb.schema test: all checks passed.'; cr]
  ifFalse: [
    out nextPutAll: 'gemdb.schema test FAILED:'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr]].
"Hand the verdict to session 2, which owns the exit status -- and COMMIT it,
or session 2 reads the default and reports a failure this run did not have."
UserGlobals at: #'Grail_schema_failures' put: failures size.
System commit
%
logout

! ===========================================================================
! Session 2 -- a fresh login: the committed instances still read, and the
!              repository is left clean.
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
| out failures |
out := GsFile stdout.
failures := UserGlobals at: #'Grail_schema_failures' otherwise: 1.
[
  "Session 1 removed its root keys, so all this session verifies is that it
  left nothing behind: the fixture module's classes are gone from the
  registry it snapshotted, and no key remains."
  importlib ___canonicalRegistryRestore___:
    (UserGlobals at: #'Grail_schema_snap' ifAbsent: [importlib ___canonicalRegistrySnapshot___]).
  [GsFile removeServerFile: (UserGlobals at: #'Grail_schema_path' ifAbsent: [''])]
    on: Error do: [:e | ].
  (importlib @env1:modules)
    removeKey: (UserGlobals at: #'Grail_schema_mod' ifAbsent: ['x']) asSymbol ifAbsent: [].
] ensure: [
  UserGlobals removeKey: #'Grail_schema_snap' ifAbsent: [].
  UserGlobals removeKey: #'Grail_schema_path' ifAbsent: [].
  UserGlobals removeKey: #'Grail_schema_mod' ifAbsent: [].
  UserGlobals removeKey: #'Grail_schema_failures' ifAbsent: [].
  System commit
].
failures = 0
  ifTrue: [
    out nextPutAll: 'gemdb.schema regressions: all checks passed.'; cr.
    ExitClientError signal: 'gemdb.schema regressions passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'gemdb.schema regressions FAILED: '; print: failures;
        nextPutAll: ' check(s) -- see session 1 above.'; cr.
    ExitClientError signal: 'gemdb.schema regressions failed!' status: 1]
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report -- fail loudly instead of exit 0.
exit 1
