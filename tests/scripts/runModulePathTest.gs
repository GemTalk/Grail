output pushnew runModulePathTest.out
! file tests/scripts/runModulePathTest.gs
!
! Functional test for the deployed-module source-path rule
! (docs/Persistent_Modules_and_Classes.md D10; importlib class >>
! ___refuseForeignSourcePath___:for:) and its two commands,
! gemdb.modules.relocate and gemdb.modules.forget.
!
! Not an SUnit test: the rule is about a COMMITTED module, so the fixture has
! to be deployed, and forget() scans the repository and commits itself.
!
! Session 1 deploys a module from directory a/, stores an instance of its class
! in gemdb.root, and checks: a different file with different source under the
! same name (b/) is refused and leaves the session clean; an identical copy
! at another path (c/) is accepted; forget() refuses while the instance exists;
! and forget() of a second module that has no instances succeeds, after which
! the name builds from another file.  Session 2 logs in fresh: an edited copy
! in moved/ is refused, relocate() lets it rebuild in place under the stored
! instance, and the OLD path is then the foreign one.  Session 2 cleans up.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! Session 1 -- deploy, refuse, accept a copy, forget.
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
| out evalPython failures check root modName mod2 write load refusal r userClass |
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
"Per-user names and directory: several worktrees share /tmp on one machine,
and a deployed module outlives this run unless the cleanup below removes it."
modName := 'grail_modpath_' , System myUserProfile userId asString.
mod2 := 'grail_modpath2_' , System myUserProfile userId asString.
root := '/tmp/' , modName.
#('' '/a' '/b' '/c' '/moved') do: [:sub |
  [GsFile createServerDirectory: root , sub] on: Error do: [:e | e return: nil]].
UserGlobals at: #'Grail_modpath_snap' put: importlib ___canonicalRegistrySnapshot___.
UserGlobals at: #'Grail_modpath_root' put: root.
UserGlobals at: #'Grail_modpath_mod' put: modName.
UserGlobals at: #'Grail_modpath_mod2' put: mod2.
write := [:path :src | | f | f := GsFile openWriteOnServer: path. f nextPutAll: src. f close].
load := [:sub :name | importlib loadModuleFromPath: root , sub , '/' , name , '.py' name: name].
"What the import raised, or nil."
refusal := [:sub :name | [load value: sub value: name. nil] on: ImportError do: [:e | e return: e messageText asString]].
write value: root , '/a/' , modName , '.py' value: 'class User:
    def __init__(self, name):
        self.name = name

    def hello(self):
        return "A " + self.name
'.
write value: root , '/b/' , modName , '.py' value: 'class User:
    def __init__(self, name):
        self.name = name
        self.email = None

    def hello(self):
        return "B " + self.name
'.
write value: root , '/c/' , modName , '.py' value: ((GsFile openReadOnServer: root , '/a/' , modName , '.py') contents).
write value: root , '/moved/' , modName , '.py' value: 'class User:
    def __init__(self, name):
        self.name = name

    def hello(self):
        return "moved " + self.name
'.
write value: root , '/a/' , mod2 , '.py' value: 'class Thing:
    pass
'.
write value: root , '/b/' , mod2 , '.py' value: 'class Thing:
    def other(self):
        return 2
'.

"Deploy from a/, with one stored instance."
load value: '/a' value: modName.
load value: '/a' value: mod2.
System commitTransaction ifFalse: [self error: 'the deploy commit failed'].
userClass := (importlib @env1:lookupModule: modName) @env1:User.
evalPython value: 'import gemdb, ' , modName , ' as m
gemdb.root["' , modName , '"] = m.User("ann")
gemdb.commit()'.
check value: 'the deployed source path is the file it was built from'
  value: ((importlib ___deployedSourcePathOf___: modName) includesString: '/a/').

"A different file with different source under the deployed name."
r := refusal value: '/b' value: modName.
check value: 'a different file with different source is refused (ImportError)'
  value: (r notNil and: [(r includesString: 'gemdb.modules.relocate') and: [r includesString: 'gemdb.modules.forget']]).
check value: 'the refusal leaves nothing to commit' value: System needsCommit not.
check value: 'the deployed class was not touched'
  value: (((importlib @env1:lookupModule: modName) @env1:User) == userClass
    and: [(userClass includesSelector: #'___pyattr_email___' environmentId: 1) not]).

"The same source at another path is the same module."
r := refusal value: '/c' value: modName.
check value: 'an identical copy at another path is accepted' value: r isNil.
System abortTransaction.

"forget() refuses while an instance of the module's classes exists."
r := evalPython value: 'import gemdb.modules
try:
    gemdb.modules.forget("' , modName , '")
    __r = "not refused"
except ValueError as e:
    __r = str(e)
__r'.
check value: 'forget refuses while an instance exists, as a catchable ValueError'
  value: ((r isKindOf: CharacterCollection) and: [r includesString: 'still has 1 instance']).

"forget() of a module with no instances succeeds, and the name then builds
from another file -- a new class, not the old one rebuilt."
r := evalPython value: 'import gemdb.modules
__r = gemdb.modules.forget("' , mod2 , '")
__r["modules"] * 10 + __r["classes"]'.
check value: 'forget of a module with no instances answers 1 module, 1 class' value: r = 11.
check value: 'forget committed (nothing left to commit)' value: System needsCommit not.
check value: 'after forget the name is no longer deployed'
  value: (importlib ___deployedSourcePathOf___: mod2) isNil.
r := refusal value: '/b' value: mod2.
check value: 'after forget another file builds under the name' value: r isNil.
check value: 'and it is the new source'
  value: (((importlib @env1:lookupModule: mod2) @env1:Thing) includesSelector: #'other' environmentId: 1).
System commitTransaction ifFalse: [self error: 'the mod2 commit failed'].

failures isEmpty ifFalse: [
  out nextPutAll: 'Session 1 failures:'; cr.
  failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr]].
UserGlobals at: #'Grail_modpath_failures' put: failures size.
System commit
%
logout

! ===========================================================================
! Session 2 -- a fresh login: relocate, and the old path becomes foreign.
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
| out evalPython failures check root modName load refusal r stored |
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
root := UserGlobals at: #'Grail_modpath_root'.
modName := UserGlobals at: #'Grail_modpath_mod'.
load := [:sub :name | importlib loadModuleFromPath: root , sub , '/' , name , '.py' name: name].
refusal := [:sub :name | [load value: sub value: name. nil] on: ImportError do: [:e | e return: e messageText asString]].
[
  r := refusal value: '/moved' value: modName.
  check value: 'a fresh session is refused the moved, edited file too' value: r notNil.
  r := evalPython value: 'import gemdb.modules
gemdb.modules.relocate("' , modName , '")
1'.
  check value: 'relocate answers and writes nothing' value: (r = 1 and: [System needsCommit not]).
  r := refusal value: '/moved' value: modName.
  check value: 'after relocate the moved file imports' value: r isNil.
  r := evalPython value: 'import gemdb, ' , modName , ' as m
__u = gemdb.root["' , modName , '"]
(type(__u) is m.User, __u.hello())'.
  check value: 'the stored instance keeps its class and runs the moved code'
    value: ((r @env1:__getitem__: 0) == true and: [(r @env1:__getitem__: 1) = 'moved ann']).
  check value: 'the deployed path is now the moved file once committed'
    value: (System commitTransaction and: [(importlib ___deployedSourcePathOf___: modName) includesString: '/moved/']).
  r := refusal value: '/a' value: modName.
  check value: 'the OLD path is now the foreign one' value: r notNil.
  System abortTransaction.
  r := evalPython value: 'import gemdb.modules
try:
    gemdb.modules.relocate("grail_modpath_no_such_module")
    __r = "accepted"
except ValueError:
    __r = "refused"
__r'.
  check value: 'relocate refuses a name with nothing deployed' value: r = 'refused'.
] ensure: [
  System abortTransaction.
  evalPython value: 'import gemdb
gemdb.root.pop("' , modName , '", None)
gemdb.commit()'.
  importlib ___canonicalRegistryRestore___:
    (UserGlobals at: #'Grail_modpath_snap' ifAbsent: [importlib ___canonicalRegistrySnapshot___]).
  {modName. UserGlobals at: #'Grail_modpath_mod2' ifAbsent: ['x']} do: [:n |
    (importlib @env1:modules) removeKey: n asSymbol ifAbsent: [].
    #('/a/' '/b/' '/c/' '/moved/') do: [:sub |
      [GsFile removeServerFile: root , sub , n , '.py'] on: Error do: [:e | e return: nil]]].
  #('/a' '/b' '/c' '/moved' '') do: [:sub |
    [GsFile removeServerDirectory: root , sub] on: Error do: [:e | e return: nil]].
  failures addAll: ((1 to: (UserGlobals at: #'Grail_modpath_failures' otherwise: 1)) collect: [:i | 'session 1 check']).
  #(#'Grail_modpath_snap' #'Grail_modpath_root' #'Grail_modpath_mod' #'Grail_modpath_mod2' #'Grail_modpath_failures')
    do: [:k | UserGlobals removeKey: k ifAbsent: []].
  System commit].
failures isEmpty
  ifTrue: [
    out nextPutAll: 'Module source-path regressions: all checks passed.'; cr.
    ExitClientError signal: 'module source-path regressions passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'Module source-path regressions FAILED: '; print: failures size;
        nextPutAll: ' check(s):'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
    ExitClientError signal: 'module source-path regressions failed!' status: 1]
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report -- fail loudly instead of exit 0.
exit 1
