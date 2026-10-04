output pushnew runAppMainTest.out
! file tests/scripts/runAppMainTest.gs
!
! Functional test for app namespaces, cuts 3 and 4 (docs/App_Namespaces_Design.md
! §5): ``__main__'' in an app.  Its globals are the app's persistent
! dictionary, with GemStone semantics; an unchanged re-run writes nothing;
! ``__transient__'' names stay per session; gemdb.root is an alias for the
! globals; the top file's classes keep their identity across runs.  And cut 4
! (§5.4): a module-level ``Final'' the committed globals hold keeps its value
! without evaluating its initializer.
!
! Not an SUnit test: every property here is about what a COMMIT keeps and what
! a FRESH session finds.
!
! Session 1 runs the top file in the app and commits.  Session 2 re-runs it
! unchanged (nothing written, the same objects, a transient global rebound and
! never committed), doubles the rabbits through gemdb.root, commits, then shows
! an abort reloading a rebound global, unbinding a new one and leaving a
! transient alone.  Session 3 runs an EDITED top file: the stored instance keeps
! its class, which gained the new attribute's code; a different top file in the
! same app is refused.  Session 3 cleans up.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! Session 1 -- the first run of the top file in the app.
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
| out failures check user root app write main apps |
out := GsFile stdout.
failures := OrderedCollection new.
check := [:label :ok |
  ok
    ifTrue: [out nextPutAll: '  PASS  ', label; cr]
    ifFalse: [failures add: label. out nextPutAll: '  FAIL  ', label; cr]].
"Per-user names: several worktrees share one stone and /tmp."
user := System myUserProfile userId asString.
app := 'grail_appmain_' , user.
root := '/tmp/' , app.
"Self-heal: dropping the app drops everything a killed run left in it."
apps := UserGlobals at: #'GrailApps' otherwise: nil.
apps ifNotNil: [apps removeKey: app ifAbsent: []].
System commitTransaction ifFalse: [self error: 'the self-heal commit failed'].
[GsFile createServerDirectory: root] on: Error do: [:e | e return: nil].
UserGlobals at: #'Grail_appmain_root' put: root.
UserGlobals at: #'Grail_appmain_app' put: app.
write := [:path :src | | f | f := GsFile openWriteOnServer: path. f nextPutAll: src. f close].
write value: root , '/main.py' value: 'import gemdb
from os import path as osp

from typing import Final

__transient__ = ["scratch", "evaluated"]
scratch = "session"
evaluated = []
greeting = "hello"
pair = (1, 2)

def make_started():
    evaluated.append("started")
    return object()

started: Final = make_started()

class A:
    def __init__(self):
        self.x = 1

class B(A):
    pass

if "b1" not in globals():
    b1 = B()
if "rabbits" not in globals():
    rabbits = 2
'.
"Session 3's edit: A gains an attribute; b2 is made by the new code."
write value: root , '/main_v2.py' value: 'import gemdb
from os import path as osp

from typing import Final

__transient__ = ["scratch", "evaluated"]
scratch = "session"
evaluated = []
greeting = "hello"
pair = (1, 2)

def make_started():
    evaluated.append("started")
    return object()

started: Final = make_started()

class A:
    def __init__(self):
        self.x = 1
        self.z = 3

    def zed(self):
        return getattr(self, "z", "none")

class B(A):
    pass

if "b1" not in globals():
    b1 = B()
if "rabbits" not in globals():
    rabbits = 2
b2 = B()
'.
write value: root , '/other.py' value: 'print("a different top file")
'.

System gemEnvironmentVariable: 'GEMDB_NAMESPACE' put: app.
main := importlib runPath: root , '/main.py'.
check value: 'the top file runs as the app''s canonical __main__'
  value: (((importlib ___grailNamespace___ at: #'GrailCanonicalModules') at: '__main__' otherwise: nil) == main).
check value: 'a transient global reads in the session that set it'
  value: (main dynamicInstVarAt: #'scratch') = 'session'.
check value: 'a Final initializer runs on the first run'
  value: (main dynamicInstVarAt: #'evaluated') size = 1.
check value: 'the first run commits' value: System commitTransaction.

failures isEmpty ifFalse: [
  out nextPutAll: 'Session 1 failures:'; cr.
  failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr]].
UserGlobals at: #'Grail_appmain_failures' put: failures size.
System commit
%
logout

! ===========================================================================
! Session 2 -- an unchanged re-run, the root alias, abort.
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
| out evalPython failures check root app ns committed b1 started main r |
out := GsFile stdout.
failures := OrderedCollection new.
check := [:label :ok |
  ok
    ifTrue: [out nextPutAll: '  PASS  ', label; cr]
    ifFalse: [failures add: label. out nextPutAll: '  FAIL  ', label; cr]].
evalPython := [:src |
  | moduleScope scope module |
  moduleScope := SymbolDictionary new.
  scope := System myUserProfile symbolList copy.
  scope insertObject: moduleScope at: 1.
  module := ModuleAst parseSource: src.
  module useTempsForBlock: false.
  module ensureModuleScope: moduleScope.
  module evaluateWithScope: scope].
root := UserGlobals at: #'Grail_appmain_root'.
app := UserGlobals at: #'Grail_appmain_app'.
ns := importlib ___grailAppNamed___: app create: false.
committed := (ns at: #'GrailCanonicalModules') at: '__main__'.
"Read past the transient override: what the COMMITTED instance stores."
check value: 'a transient global was never committed'
  value: ((committed _instvarNamesAfter: committed namedSize) includes: #'scratch') not.
check value: 'the other globals were'
  value: ((committed _instvarNamesAfter: committed namedSize) includes: #'rabbits').
b1 := committed dynamicInstVarAt: #'b1'.
started := committed dynamicInstVarAt: #'started'.

System gemEnvironmentVariable: 'GEMDB_NAMESPACE' put: app.
main := importlib runPath: root , '/main.py'.
check value: 'a re-run runs over the committed globals' value: main == committed.
check value: 'an unchanged re-run writes nothing' value: System needsCommit not.
check value: 'its stored object is the same object' value: (main dynamicInstVarAt: #'b1') == b1.
check value: 'the transient global was rebound by this run'
  value: (main dynamicInstVarAt: #'scratch') = 'session'.
check value: 'a Final the committed globals hold keeps its value'
  value: (main dynamicInstVarAt: #'started') == started.
check value: 'and its initializer does not run'
  value: (main dynamicInstVarAt: #'evaluated') isEmpty.

"gemdb.root in an app is the globals.  The rabbits double."
r := evalPython value: 'import gemdb
gemdb.root["rabbits"] = gemdb.root["rabbits"] * 2
(gemdb.namespace(), "b1" in gemdb.root, "__name__" in list(gemdb.root))'.
check value: 'gemdb.root names the app''s globals, without the dunders'
  value: ((r @env1:__getitem__: 0) = app and: [(r @env1:__getitem__: 1) == true
    and: [(r @env1:__getitem__: 2) == false]]).
check value: 'a write through gemdb.root is the global'
  value: (main dynamicInstVarAt: #'rabbits') = 4.
check value: 'and commits' value: System commitTransaction.

"GemStone semantics: an abort reloads the committed values."
evalPython value: 'import gemdb
gemdb.root["rabbits"] = 99
gemdb.root["fresh"] = 1
gemdb.root["scratch"] = "changed"'.
check value: 'the run''s writes are visible before the abort'
  value: (main dynamicInstVarAt: #'rabbits') = 99.
r := evalPython value: 'import gemdb
gemdb.abort()
(gemdb.root["rabbits"], "fresh" in gemdb.root, gemdb.root["scratch"])'.
check value: 'abort reloads a rebound global' value: (r @env1:__getitem__: 0) = 4.
check value: 'abort unbinds a global first bound since the commit' value: (r @env1:__getitem__: 1) == false.
check value: 'abort leaves a transient global alone' value: (r @env1:__getitem__: 2) = 'changed'.

failures isEmpty ifFalse: [
  out nextPutAll: 'Session 2 failures:'; cr.
  failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr]].
System abortTransaction.
UserGlobals at: #'Grail_appmain_failures'
  put: (UserGlobals at: #'Grail_appmain_failures' otherwise: 1) + failures size.
System commit
%
logout

! ===========================================================================
! Session 3 -- an edited top file keeps its classes; another file is refused.
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
| out evalPython failures check root app ns committed oldB oldStarted main r apps |
out := GsFile stdout.
failures := OrderedCollection new.
check := [:label :ok |
  ok
    ifTrue: [out nextPutAll: '  PASS  ', label; cr]
    ifFalse: [failures add: label. out nextPutAll: '  FAIL  ', label; cr]].
evalPython := [:src |
  | moduleScope scope module |
  moduleScope := SymbolDictionary new.
  scope := System myUserProfile symbolList copy.
  scope insertObject: moduleScope at: 1.
  module := ModuleAst parseSource: src.
  module useTempsForBlock: false.
  module ensureModuleScope: moduleScope.
  module evaluateWithScope: scope].
root := UserGlobals at: #'Grail_appmain_root'.
app := UserGlobals at: #'Grail_appmain_app'.
[
  ns := importlib ___grailAppNamed___: app create: false.
  committed := (ns at: #'GrailCanonicalModules') at: '__main__'.
  oldB := (committed dynamicInstVarAt: #'b1') class.
  oldStarted := committed dynamicInstVarAt: #'started'.
  "The edited file replaces main.py: an app has one top file."
  (GsFile openWriteOnServer: root , '/main.py')
    nextPutAll: (GsFile openReadOnServer: root , '/main_v2.py') contents;
    close.
  System gemEnvironmentVariable: 'GEMDB_NAMESPACE' put: app.
  main := importlib runPath: root , '/main.py'.
  r := evalPython value: 'import gemdb
__b1 = gemdb.root["b1"]
__b2 = gemdb.root["b2"]
(type(__b1) is type(__b2), __b2.z, __b1.zed(), gemdb.root["rabbits"])'.
  check value: 'after an edit, the stored instance and a new one share one class'
    value: (r @env1:__getitem__: 0) == true.
  check value: 'it is the class the first run made, rebuilt in place'
    value: (main dynamicInstVarAt: #'B') == oldB.
  check value: 'new instances run the edited code' value: (r @env1:__getitem__: 1) = 3.
  check value: 'the stored instance runs it too' value: (r @env1:__getitem__: 2) = 'none'.
  check value: 'the globals the edit did not touch kept their committed values'
    value: (r @env1:__getitem__: 3) = 4.
  check value: 'an edit keeps a Final''s committed value too'
    value: ((main dynamicInstVarAt: #'started') == oldStarted
      and: [(main dynamicInstVarAt: #'evaluated') isEmpty]).
  check value: 'the edited run commits' value: System commitTransaction.
  r := [importlib runPath: root , '/other.py'. nil]
    on: ImportError do: [:e | e return: e messageText asString].
  check value: 'a different top file in the same app is refused (D10)' value: r notNil.
] ensure: [
  System gemEnvironmentVariable: 'GEMDB_NAMESPACE' put: ''.
  System abortTransaction.
  importlib ___grailUseApp___: nil.
  apps := UserGlobals at: #'GrailApps' otherwise: nil.
  apps ifNotNil: [apps removeKey: app ifAbsent: []].
  #('/main.py' '/main_v2.py' '/other.py') do: [:f |
    [GsFile removeServerFile: root , f] on: Error do: [:e | e return: nil]].
  [GsFile removeServerDirectory: root] on: Error do: [:e | e return: nil].
  failures addAll: ((1 to: (UserGlobals at: #'Grail_appmain_failures' otherwise: 1)) collect: [:i | 'an earlier session''s check']).
  #(#'Grail_appmain_root' #'Grail_appmain_app' #'Grail_appmain_failures')
    do: [:k | UserGlobals removeKey: k ifAbsent: []].
  System commit].
failures isEmpty
  ifTrue: [
    out nextPutAll: 'App __main__ regressions: all checks passed.'; cr.
    ExitClientError signal: 'app __main__ regressions passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'App __main__ regressions FAILED: '; print: failures size;
        nextPutAll: ' check(s):'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
    ExitClientError signal: 'app __main__ regressions failed!' status: 1]
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report -- fail loudly instead of exit 0.
exit 1
