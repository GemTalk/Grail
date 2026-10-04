output pushnew runAppNamespaceTest.out
! file tests/scripts/runAppNamespaceTest.gs
!
! Functional test for app namespaces, cut 2 (docs/App_Namespaces_Design.md
! §3-§4, §9): imports resolve per namespace.
!
! Not an SUnit test: the point is two DEPLOYED modules of one name, so the
! fixtures are committed and read back by fresh sessions.
!
! Session 1 joins app A with gemdb.set_app, deploys module <mod> from a/ and
! stores an instance of its class.  Session 2 joins app B and deploys a
! DIFFERENT <mod> from b/ under the same name -- which, without apps, D10
! refuses -- and stores one of its instances.  Session 3 rejoins app A: the
! import warm-binds A's module and writes nothing, A's stored instance has A's
! class and runs A's code, B's still runs B's, b/ is now the foreign file IN
! APP A, and set_app refuses a second app.  Session 4 chooses app B through
! GEMDB_APP and runs a script with runPath:, the launcher's path.  Session 4
! also cleans up: the apps, the stored instances and the files.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! Session 1 -- app A deploys <mod> from a/.
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
| out evalPython failures check user root modName appA appB write nsA cls r apps |
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
"Per-user names: several worktrees share one stone and /tmp."
user := System myUserProfile userId asString.
modName := 'grail_appns_' , user.
appA := 'grail_appns_a_' , user.
appB := 'grail_appns_b_' , user.
root := '/tmp/' , modName.
"Self-heal: a run killed before its cleanup leaves its apps behind, and the
next run would warm-bind the stale fixtures.  Dropping an app drops
everything deployed in it."
apps := UserGlobals at: #'GrailApps' otherwise: nil.
apps ifNotNil: [apps removeKey: appA ifAbsent: []. apps removeKey: appB ifAbsent: []].
System commitTransaction ifFalse: [self error: 'the self-heal commit failed'].
#('' '/a' '/b') do: [:sub |
  [GsFile createServerDirectory: root , sub] on: Error do: [:e | e return: nil]].
UserGlobals at: #'Grail_appns_root' put: root.
UserGlobals at: #'Grail_appns_mod' put: modName.
UserGlobals at: #'Grail_appns_a' put: appA.
UserGlobals at: #'Grail_appns_b' put: appB.
write := [:path :src | | f | f := GsFile openWriteOnServer: path. f nextPutAll: src. f close].
write value: root , '/a/' , modName , '.py' value: 'import graphlib

class User:
    def __init__(self, name):
        self.name = name

    def hello(self):
        return "A " + self.name
'.
write value: root , '/b/' , modName , '.py' value: 'class User:
    def __init__(self, name, email=None):
        self.name = name
        self.email = email

    def hello(self):
        return "B " + self.name
'.
write value: root , '/b/main.py' value: 'import gemdb
app = gemdb.app()
import ' , modName , '
hello = ' , modName , '.User("cy").hello()
'.

r := evalPython value: 'import gemdb
gemdb.set_app("' , appA , '")
gemdb.app()'.
check value: 'gemdb.set_app joins the app and gemdb.app() names it' value: r = appA.
nsA := importlib ___grailNamespace___.
importlib loadModuleFromPath: root , '/a/' , modName , '.py' name: modName.
cls := (importlib @env1:lookupModule: modName) class.
check value: 'the module''s backing class is filed in the app'
  value: ((nsA at: #'GrailModuleClasses' otherwise: nil) ifNil: [false] ifNotNil: [:d | (d at: modName asSymbol otherwise: nil) == cls]).
check value: 'and not in the shared PythonModules'
  value: (PythonModules at: modName asSymbol otherwise: nil) ~~ cls.
check value: 'its hash is recorded in the app, not the shared base'
  value: (((nsA at: #'GrailCanonicalModuleHashes') includesKey: modName)
    and: [((UserGlobals at: #'GrailCanonicalModuleHashes' otherwise: nil) ifNil: [true] ifNotNil: [:h | (h includesKey: modName) not])]).
check value: 'the stdlib module it imported stays in the shared base'
  value: ((importlib ___grailNamespaceOf___: 'graphlib') == UserGlobals
    and: [((nsA at: #'GrailCanonicalModuleHashes') includesKey: 'graphlib') not]).
"The stored instance is a global of the deployed module itself, which is
persistent: in an app, gemdb.root is the app's top-file globals, and this app
has no top file (runAppMainTest.gs covers that)."
evalPython value: 'import gemdb, ' , modName , ' as m
m.saved = m.User("ann")
gemdb.commit()'.
check value: 'the app and its deployment commit' value: System needsCommit not.

failures isEmpty ifFalse: [
  out nextPutAll: 'Session 1 failures:'; cr.
  failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr]].
UserGlobals at: #'Grail_appns_failures' put: failures size.
System commit
%
logout

! ===========================================================================
! Session 2 -- app B deploys a DIFFERENT <mod> from b/, unrefused.
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
| out evalPython failures check root modName appA appB r nsA nsB |
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
root := UserGlobals at: #'Grail_appns_root'.
modName := UserGlobals at: #'Grail_appns_mod'.
appA := UserGlobals at: #'Grail_appns_a'.
appB := UserGlobals at: #'Grail_appns_b'.
evalPython value: 'import gemdb
gemdb.set_app("' , appB , '")'.
nsB := importlib ___grailNamespace___.
nsA := importlib ___grailAppNamed___: appA create: false.
r := [importlib loadModuleFromPath: root , '/b/' , modName , '.py' name: modName. nil]
  on: ImportError do: [:e | e return: e messageText asString].
check value: 'a second app imports its own file under the same name, unrefused' value: r isNil.
check value: 'each app has its own User class'
  value: (((nsB at: #'GrailCanonicalClasses') at: modName , '.User')
    ~~ ((nsA at: #'GrailCanonicalClasses') at: modName , '.User')).
evalPython value: 'import gemdb, ' , modName , ' as m
m.saved = m.User("bob", "bob@example.com")
gemdb.commit()'.
r := (((nsA at: #'GrailCanonicalModules') at: modName) dynamicInstVarAt: #'saved') @env1:hello.
check value: 'app A''s stored instance still runs app A''s code in app B' value: r = 'A ann'.

failures isEmpty ifFalse: [
  out nextPutAll: 'Session 2 failures:'; cr.
  failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr]].
UserGlobals at: #'Grail_appns_failures'
  put: (UserGlobals at: #'Grail_appns_failures' otherwise: 1) + failures size.
System commit
%
logout

! ===========================================================================
! Session 3 -- rejoin app A: warm bind, both apps' objects, per-app D10.
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
| out evalPython failures check root modName appA appB r bSaved |
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
root := UserGlobals at: #'Grail_appns_root'.
modName := UserGlobals at: #'Grail_appns_mod'.
appA := UserGlobals at: #'Grail_appns_a'.
appB := UserGlobals at: #'Grail_appns_b'.
evalPython value: 'import gemdb
gemdb.set_app("' , appA , '")'.
importlib loadModuleFromPath: root , '/a/' , modName , '.py' name: modName.
check value: 'rejoining app A warm-binds its module and writes nothing' value: System needsCommit not.
r := evalPython value: 'import gemdb, ' , modName , ' as m
(type(m.saved) is m.User, m.saved.hello())'.
check value: 'app A''s stored instance has app A''s class and runs its code'
  value: ((r @env1:__getitem__: 0) == true and: [(r @env1:__getitem__: 1) = 'A ann']).
bSaved := (((importlib ___grailAppNamed___: appB create: false) at: #'GrailCanonicalModules') at: modName)
  dynamicInstVarAt: #'saved'.
check value: 'app B''s stored instance keeps app B''s class and code'
  value: (bSaved class ~~ ((importlib @env1:lookupModule: modName) @env1:User)
    and: [(bSaved @env1:hello) = 'B bob']).
r := [importlib loadModuleFromPath: root , '/b/' , modName , '.py' name: modName. nil]
  on: ImportError do: [:e | e return: e messageText asString].
check value: 'within app A, b/ is the foreign file D10 refuses' value: r notNil.
System abortTransaction.
r := evalPython value: 'import gemdb
try:
    gemdb.set_app("' , appB , '")
    __r = "switched"
except RuntimeError:
    __r = "refused"
__r'.
check value: 'set_app refuses a second app in one session' value: r = 'refused'.

failures isEmpty ifFalse: [
  out nextPutAll: 'Session 3 failures:'; cr.
  failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr]].
System abortTransaction.
UserGlobals at: #'Grail_appns_failures'
  put: (UserGlobals at: #'Grail_appns_failures' otherwise: 1) + failures size.
System commit
%
logout

! ===========================================================================
! Session 4 -- GEMDB_APP chooses app B for a script; then clean up.
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
| out evalPython failures check root modName appA appB main apps |
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
root := UserGlobals at: #'Grail_appns_root'.
modName := UserGlobals at: #'Grail_appns_mod'.
appA := UserGlobals at: #'Grail_appns_a'.
appB := UserGlobals at: #'Grail_appns_b'.
[
  System gemEnvironmentVariable: 'GEMDB_APP' put: appB.
  main := importlib runPath: root , '/b/main.py'.
  check value: 'GEMDB_APP sets the app before the script runs'
    value: (main @env0:dynamicInstVarAt: #'app') = appB.
  check value: 'and the script imports app B''s module'
    value: (main @env0:dynamicInstVarAt: #'hello') = 'B cy'.
] ensure: [
  System gemEnvironmentVariable: 'GEMDB_APP' put: ''.
  System abortTransaction.
  importlib ___grailUseApp___: nil.
  apps := UserGlobals at: #'GrailApps' otherwise: nil.
  apps ifNotNil: [apps removeKey: appA ifAbsent: []. apps removeKey: appB ifAbsent: []].
  #('/a/' '/b/') do: [:sub |
    [GsFile removeServerFile: root , sub , modName , '.py'] on: Error do: [:e | e return: nil]].
  [GsFile removeServerFile: root , '/b/main.py'] on: Error do: [:e | e return: nil].
  #('/a' '/b' '') do: [:sub |
    [GsFile removeServerDirectory: root , sub] on: Error do: [:e | e return: nil]].
  failures addAll: ((1 to: (UserGlobals at: #'Grail_appns_failures' otherwise: 1)) collect: [:i | 'an earlier session''s check']).
  #(#'Grail_appns_root' #'Grail_appns_mod' #'Grail_appns_a' #'Grail_appns_b' #'Grail_appns_failures')
    do: [:k | UserGlobals removeKey: k ifAbsent: []].
  System commit].
failures isEmpty
  ifTrue: [
    out nextPutAll: 'App namespace regressions: all checks passed.'; cr.
    ExitClientError signal: 'app namespace regressions passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'App namespace regressions FAILED: '; print: failures size;
        nextPutAll: ' check(s):'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
    ExitClientError signal: 'app namespace regressions failed!' status: 1]
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report -- fail loudly instead of exit 0.
exit 1
