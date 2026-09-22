output pushnew runClassSchemaTest.out
! file tests/scripts/runClassSchemaTest.gs
!
! Functional test for the CLASS-level half of gemdb.schema: the three
! refuse-at-import checks and the three commands that answer them --
! rebase(), drop_class() and rename_class().
!
! This cannot be an SUnit test.  Each command enumerates the instances it
! moves, which is a repository scan, and a scan aborts the transaction
! first; each also re-executes a module body and commits its own work.  So
! it needs a clean transaction and a session that may commit, which SUnit is
! not.  runSchemaTest.gs is the sibling for the ATTRIBUTE-level surface.
!
! Session 1 deploys a fixture module with a committed instance and then, for
! each class-level edit, checks that the import refuses and that the named
! command moves the data rather than stranding it.  Session 2 logs in fresh
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
modName := 'grail_clsschema_' , System myUserProfile userId asString.
path := '/tmp/' , modName , '.py'.
UserGlobals at: #'Grail_clsschema_snap' put: importlib ___canonicalRegistrySnapshot___.
UserGlobals at: #'Grail_clsschema_path' put: path.
UserGlobals at: #'Grail_clsschema_mod' put: modName.

"Revision 1: Base, Other, Item(Base) and Gone.  ONE committed instance, an
Item; Gone is never instantiated, which is what lets drop_class succeed
without a garbage collection first -- the instance count comes from a
repository scan, and an unlinked object is still in the repository until it
is collected.  The classes and the instance are reached from the Python
snippets and from session 2 through gemdb.root, not through sys.modules."
f := GsFile openWriteOnServer: path.
f nextPutAll: 'import gemdb


class Base:
    def kind(self):
        return "base"


class Other:
    def kind(self):
        return "other"


class Item(Base):
    def __init__(self):
        self.a = 1
        self.b = 2


class Gone:
    def __init__(self):
        self.g = 9


gemdb.root["grail_cls_item"] = Item()
'.
f close.
(importlib @env1:modules) removeKey: modName asSymbol ifAbsent: [].
importlib loadModuleFromPath: path name: modName.
System commitTransaction ifFalse: [^ self error: 'setup: the fixture commit failed'].

[
"1. A CHANGED BASE is refused at import, naming the class and the command."
f := GsFile openWriteOnServer: path.
f nextPutAll: 'import gemdb


class Base:
    def kind(self):
        return "base"


class Other:
    def kind(self):
        return "other"


class Item(Other):
    def __init__(self):
        self.a = 1
        self.b = 2


class Gone:
    def __init__(self):
        self.g = 9
'.
f close.
(importlib @env1:modules) removeKey: modName asSymbol ifAbsent: [].
r := [importlib loadModuleFromPath: path name: modName. 'ran']
  on: ImportError do: [:ex | ex return: 'refused'].
check value: 'a changed base is refused at import' value: r = 'refused'.
System abortTransaction.

"2. rebase() performs it: the committed Item moves onto the rebuilt class,
keeps both values, and answers the NEW base's method."
r := evalPython value: '
import gemdb, gemdb.schema
gemdb.commit()
res = gemdb.schema.rebase("' , modName , '.Item")
it = gemdb.root["grail_cls_item"]
str(res["classes"]) + "," + str(res["instances"]) + "," + str(res["left_behind"]) + " " + \
    str(it.a) + "," + str(it.b) + " " + it.kind()
'.
check value: 'rebase() moves every instance onto the rebuilt class, values and new base intact'
  value: r = '1,1,0 1,2 other'.
check value: 'rebase() committed itself' value: System needsCommit not.
noteAndClean value: 'rebase()'.

"3. A class REMOVED from the source is refused at import."
f := GsFile openWriteOnServer: path.
f nextPutAll: 'import gemdb


class Base:
    def kind(self):
        return "base"


class Other:
    def kind(self):
        return "other"


class Item(Other):
    def __init__(self):
        self.a = 1
        self.b = 2
'.
f close.
(importlib @env1:modules) removeKey: modName asSymbol ifAbsent: [].
r := [importlib loadModuleFromPath: path name: modName. 'ran']
  on: ImportError do: [:ex | ex return: 'refused'].
check value: 'a class the source no longer defines is refused at import' value: r = 'refused'.
System abortTransaction.

"4. drop_class() REFUSES while an instance exists, and says so as a ValueError.
Item is the class with the committed instance."
r := evalPython value: '
import gemdb, gemdb.schema
gemdb.commit()
try:
    gemdb.schema.drop_class("' , modName , '.Item")
    verdict = "ran"
except ValueError:
    verdict = "refused"
verdict
'.
check value: 'drop_class() refuses while an instance exists, as a catchable ValueError'
  value: r = 'refused'.
noteAndClean value: 'the refused drop_class'.

"5. A class nothing was ever stored against goes straight through."
r := evalPython value: '
import gemdb, gemdb.schema
gemdb.commit()
res = gemdb.schema.drop_class("' , modName , '.Gone")
str(res["classes"]) + "," + str(res["instances"])
'.
check value: 'drop_class() forgets the class once nothing is stored against it'
  value: r = '1,0'.
check value: 'drop_class() committed itself' value: System needsCommit not.

"6. The same source now imports: the class it stopped defining is gone from
the schema too, so there is nothing left to refuse."
(importlib @env1:modules) removeKey: modName asSymbol ifAbsent: [].
r := [importlib loadModuleFromPath: path name: modName. 'ran']
  on: ImportError do: [:ex | ex return: 'refused'].
check value: 'after drop_class the same source imports' value: r = 'ran'.
noteAndClean value: 'the import after drop_class'.

"7. RENAME a class: the source calls it Thing, and rename_class moves the
committed instance onto the new class -- a command, not a declaration,
because GemStone refuses to rename a class at all."
f := GsFile openWriteOnServer: path.
f nextPutAll: 'import gemdb


class Base:
    def kind(self):
        return "base"


class Other:
    def kind(self):
        return "other"


class Thing(Other):
    def __init__(self):
        self.a = 1
        self.b = 2
'.
f close.
(importlib @env1:modules) removeKey: modName asSymbol ifAbsent: [].
r := [importlib loadModuleFromPath: path name: modName. 'ran']
  on: ImportError do: [:ex | ex return: 'refused'].
check value: 'the renamed-away class is refused at import too' value: r = 'refused'.
System abortTransaction.

r := evalPython value: '
import gemdb, gemdb.schema
gemdb.commit()
res = gemdb.schema.rename_class("' , modName , '.Item", "Thing")
it = gemdb.root["grail_cls_item"]
str(res["classes"]) + "," + str(res["instances"]) + "," + str(res["left_behind"]) + " " + \
    str(it.a) + "," + str(it.b) + " " + type(it).__name__
'.
check value: 'rename_class() moves the instances onto the class the new source defines'
  value: r = '1,1,0 1,2 Thing'.
check value: 'rename_class() committed itself' value: System needsCommit not.

"8. Whether the renamed source imports cleanly from here on is a question
for a FRESH session, and session 2 asks it.  Re-importing in THIS one would
only trip the unrelated deployed-module guard: rename_class re-executed the
body through reload:, which records the module's source hash, so a second
loadModuleFromPath: here is the ``removed from sys.modules in this session''
case rather than anything to do with the schema."
] ensure: [
  evalPython value: '
import gemdb
for k in ("grail_cls_item",):
    gemdb.root.pop(k, None)
gemdb.commit()
'.
  System commit
].

out cr.
failures isEmpty
  ifTrue: [
    out nextPutAll: 'gemdb.schema class-level test: all checks passed.'; cr]
  ifFalse: [
    out nextPutAll: 'gemdb.schema class-level test FAILED:'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr]].
UserGlobals at: #'Grail_clsschema_failures' put: failures size.
System commit
%
logout

! ===========================================================================
! Session 2 -- a fresh login: the repository is left clean.
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
failures := UserGlobals at: #'Grail_clsschema_failures' otherwise: 1.
[
  "The renamed source imports cleanly in a session that did not do the
  renaming: nothing is refused, because the schema now matches the source."
  | r |
  r := [importlib loadModuleFromPath: (UserGlobals at: #'Grail_clsschema_path' ifAbsent: [''])
          name: (UserGlobals at: #'Grail_clsschema_mod' ifAbsent: ['x']). 'ran']
    on: ImportError do: [:ex |
      out nextPutAll: '  FAIL  a fresh session imports the renamed source: ' ,
        (ex messageText ifNil: ['']); cr.
      ex return: 'refused'].
  r = 'ran'
    ifTrue: [out nextPutAll: '  PASS  a fresh session imports the renamed source'; cr]
    ifFalse: [failures := failures + 1].
  importlib ___canonicalRegistryRestore___:
    (UserGlobals at: #'Grail_clsschema_snap' ifAbsent: [importlib ___canonicalRegistrySnapshot___]).
  [GsFile removeServerFile: (UserGlobals at: #'Grail_clsschema_path' ifAbsent: [''])]
    on: Error do: [:e | ].
  (importlib @env1:modules)
    removeKey: (UserGlobals at: #'Grail_clsschema_mod' ifAbsent: ['x']) asSymbol ifAbsent: [].
] ensure: [
  UserGlobals removeKey: #'Grail_clsschema_snap' ifAbsent: [].
  UserGlobals removeKey: #'Grail_clsschema_path' ifAbsent: [].
  UserGlobals removeKey: #'Grail_clsschema_mod' ifAbsent: [].
  UserGlobals removeKey: #'Grail_clsschema_failures' ifAbsent: [].
  System commit
].
failures = 0
  ifTrue: [
    out nextPutAll: 'gemdb.schema class-level regressions: all checks passed.'; cr.
    ExitClientError signal: 'class-schema regressions passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'gemdb.schema class-level regressions FAILED: '; print: failures;
        nextPutAll: ' check(s) -- see session 1 above.'; cr.
    ExitClientError signal: 'class-schema regressions failed!' status: 1]
%
