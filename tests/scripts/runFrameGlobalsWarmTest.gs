output pushnew runFrameGlobalsWarmTest.out
! file tests/scripts/runFrameGlobalsWarmTest.gs
!
! A frame of a deployed module this session never imported still has its
! f_globals (PyFrame >> f_globals, importlib >> ___committedModuleWithFile___:).
!
! A warm bind does not run a module's body, so it does not run the body's
! imports: committed code reaches functions of modules that are in neither
! sys.modules nor the session's adopted instances.  A frame of such a function
! answered f_globals None, and pytest's unittest support ended whole sessions
! with an INTERNALERROR (s3transfer, opentelemetry-api and pyparsing in the
! package census).
!
! Not an SUnit test: the scenario needs a DEPLOYED app, committed and read back
! by a fresh session.
!
! Session 1 joins an app, deploys <top>, <pkg>.mgr and <pkg>.callee, and
! commits.  Session 2 rejoins the app and imports <top> only.  <top>.go calls
! <pkg>.mgr.run, which calls <pkg>.callee.boom, which divides by zero without
! reading a global -- so callee is never adopted.  The check is that boom's
! frame reports callee's globals.  Session 2 also cleans up: the app and the files.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! Session 1 -- deploy the modules in an app.
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
| out evalPython user root pkg top app write apps |
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
"Per-user names: several worktrees share one stone and /tmp."
user := System myUserProfile userId asString.
pkg := 'grail_fgw_pkg_' , user.
top := 'grail_fgw_top_' , user.
app := 'grail_fgw_app_' , user.
root := '/tmp/grail_fgw_' , user.
"Self-heal: a run killed before its cleanup leaves its app behind, and this
run would warm-bind the stale deployment."
apps := UserGlobals at: #'GrailApps' otherwise: nil.
apps ifNotNil: [apps removeKey: app ifAbsent: []].
System commitTransaction ifFalse: [self error: 'the self-heal commit failed'].
#('' '/pkg') do: [:sub |
  [GsFile createServerDirectory: root , sub] on: Error do: [:e | e return: nil]].
[GsFile createServerDirectory: root , '/' , pkg] on: Error do: [:e | e return: nil].
UserGlobals at: #'Grail_fgw_root' put: root.
UserGlobals at: #'Grail_fgw_pkg' put: pkg.
UserGlobals at: #'Grail_fgw_top' put: top.
UserGlobals at: #'Grail_fgw_app' put: app.
write := [:path :src | | f | f := GsFile openWriteOnServer: path. f nextPutAll: src. f close].
write value: root , '/' , pkg , '/__init__.py' value: ''.
write value: root , '/' , pkg , '/callee.py' value: 'MARK = "callee"

def boom():
    return 1 // 0
'.
write value: root , '/' , pkg , '/mgr.py' value: 'from .callee import boom

def run():
    return boom()
'.
write value: root , '/' , top , '.py' value: 'from ' , pkg , '.mgr import run

def go():
    return run()
'.
evalPython value: 'import gemdb, sys
gemdb.use_namespace("' , app , '")
sys.path.insert(0, "' , root , '")
import ' , top , '
gemdb.commit()'.
out nextPutAll: 'Session 1: deployed and committed: ' , System needsCommit not printString; cr.
System commit
%
logout

! ===========================================================================
! Session 2 -- rejoin the app, import <top> only, raise in callee.
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
| out evalPython failures check root pkg top app r apps |
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
root := UserGlobals at: #'Grail_fgw_root'.
pkg := UserGlobals at: #'Grail_fgw_pkg'.
top := UserGlobals at: #'Grail_fgw_top'.
app := UserGlobals at: #'Grail_fgw_app'.
[
  r := evalPython value: 'import gemdb, sys
gemdb.use_namespace("' , app , '")
sys.path.insert(0, "' , root , '")
import ' , top , '
__r = [("' , pkg , '.callee" in sys.modules)]
try:
    ' , top , '.go()
except ZeroDivisionError as e:
    tb = e.__traceback__
    while tb.tb_next is not None:
        tb = tb.tb_next
    g = tb.tb_frame.f_globals
    __r.append(tb.tb_frame.f_code.co_name)
    __r.append(None if g is None else g.get("MARK"))
__r'.
  "The scenario, not the fix: if the warm bind ever registers a module it
  did not import, this stops exercising the fallback and needs another way
  to reach an unregistered module."
  check value: 'callee is not in sys.modules (the scenario holds)'
    value: (r @env1:__getitem__: 0) == false.
  check value: 'the innermost frame is callee.boom'
    value: (r @env1:__getitem__: 1) = 'boom'.
  check value: 'and its f_globals is callee''s namespace'
    value: (r @env1:__getitem__: 2) = 'callee'.
] ensure: [
  System abortTransaction.
  importlib ___grailUseApp___: nil.
  apps := UserGlobals at: #'GrailApps' otherwise: nil.
  apps ifNotNil: [apps removeKey: app ifAbsent: []].
  #('/callee.py' '/mgr.py' '/__init__.py') do: [:f |
    [GsFile removeServerFile: root , '/' , pkg , f] on: Error do: [:e | e return: nil]].
  [GsFile removeServerFile: root , '/' , top , '.py'] on: Error do: [:e | e return: nil].
  [GsFile removeServerDirectory: root , '/' , pkg] on: Error do: [:e | e return: nil].
  [GsFile removeServerDirectory: root , '/pkg'] on: Error do: [:e | e return: nil].
  [GsFile removeServerDirectory: root] on: Error do: [:e | e return: nil].
  #(#'Grail_fgw_root' #'Grail_fgw_pkg' #'Grail_fgw_top' #'Grail_fgw_app')
    do: [:k | UserGlobals removeKey: k ifAbsent: []].
  System commit].
failures isEmpty
  ifTrue: [
    out nextPutAll: 'Frame globals (warm app): all checks passed.'; cr.
    ExitClientError signal: 'frame globals warm test passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'Frame globals (warm app) FAILED: '; print: failures size;
        nextPutAll: ' check(s):'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
    ExitClientError signal: 'frame globals warm test failed!' status: 1]
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report -- fail loudly instead of exit 0.
exit 1
