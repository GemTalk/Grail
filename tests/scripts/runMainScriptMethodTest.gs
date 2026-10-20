output pushnew runMainScriptMethodTest.out
! file tests/scripts/runMainScriptMethodTest.gs
!
! A method of a class a SCRIPT defined, called from another session, never
! re-runs the script (#1662).
!
! A script's __main__ is session-local: its module class is filed in the
! running session's own dictionary and its instance is never committed.  The
! class is committed anyway, with any class the script defines whose instance
! the script commits, because that class's methods read their globals through
! it.  A method reading any global from another session minted a fresh
! __main__ and ran the WHOLE script there: a breakpoint() in it hung the call,
! its gemdb.commit() committed the caller's work, and its class statements,
! re-run outside the script's own session, left the class's methods broken --
! committed by that same commit, so every later session found them broken too.
!
!   shop.py   class Customer (greet: self only; size: a builtin; label: its own
!             class; tagged: a script global), counts its runs in gemdb.root,
!             stores a Customer there and commits
!
! Session A: write the script, run it as __main__ (it commits).
! Session B: fresh.  greet and size answer; label and tagged raise NameError,
!   since only the script's body bound those names; the body never ran (the
!   run count is still 1) and nothing is left to commit.
! Session C: the class's methods still work (a re-run used to leave them broken,
!   and commit them so), then cleanup and the verdict.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! Session A -- write the script and run it as __main__
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
| out dir file failures runs |
out := GsFile stdout.
failures := OrderedCollection new.
"SELF-HEAL: a run that stopped before session C leaves its records behind."
(PythonTestCase new) eval: 'import gemdb
for key in ("grail_main_method_runs", "grail_main_method_customer"):
    gemdb.root.pop(key, None)
gemdb.commit()'.
dir := importlib grailDir , '/out/main_script_method'.
{ importlib grailDir , '/out' . dir } do: [:each |
  (GsFile existsOnServer: each) == true ifFalse: [GsFile createServerDirectory: each]].
UserGlobals at: #'Grail_mainMethod_script' put: dir , '/shop.py'.
file := GsFile openWriteOnServer: dir , '/shop.py'.
file nextPutAll: 'import gemdb


class Customer:
    def __init__(self, name):
        self.name = name

    def greet(self):
        return "hi " + self.name

    def size(self):
        return len(self.name)

    def label(self):
        return Customer.__name__ + ":" + self.name

    def tagged(self):
        return TAG + self.name


TAG = "#"
gemdb.root["grail_main_method_runs"] = gemdb.root.get("grail_main_method_runs", 0) + 1
gemdb.root["grail_main_method_customer"] = Customer("Ann")
gemdb.commit()
'.
file close.
importlib runPath: dir , '/shop.py'.
runs := (PythonTestCase new) eval: 'import gemdb
gemdb.root["grail_main_method_runs"]'.
runs = 1 ifFalse: [failures add: 'A: the script ran once and counted it'].
UserGlobals at: #'Grail_mainMethod_failures' put: failures asArray.
System commit.
out nextPutAll: 'sessionA: ran shop.py as __main__, which committed a Customer'; cr.
%
logout

! ===========================================================================
! Session B -- call the committed instance's methods from a fresh session
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
| out failures check answer raises |
out := GsFile stdout.
failures := OrderedCollection withAll: (UserGlobals at: #'Grail_mainMethod_failures').
check := [:label :condition | condition ifFalse: [failures add: label]].
answer := [:source | (PythonTestCase new) eval: 'import gemdb
' , source].
raises := [:source :expected |
  [(answer value: source). false]
    on: AbstractException do: [:exception |
      exception return: (exception messageText asString includesString: expected)]].
[
  check value: 'B: a fresh session starts with nothing to commit' value: System needsCommit not.
  check value: 'B: a method reading only self answers'
    value: (answer value: 'gemdb.root["grail_main_method_customer"].greet()') = 'hi Ann'.
  check value: 'B: a method reading a builtin answers'
    value: (answer value: 'gemdb.root["grail_main_method_customer"].size()') = 3.
  check value: 'B: a method reading its own class raises NameError, as only the body bound it'
    value: (raises value: 'gemdb.root["grail_main_method_customer"].label()' value: 'name ''Customer'' is not defined').
  check value: 'B: a method reading a script global raises NameError, as only the body bound it'
    value: (raises value: 'gemdb.root["grail_main_method_customer"].tagged()' value: 'name ''TAG'' is not defined').
  check value: 'B: the script never ran again (#1662)'
    value: (answer value: 'gemdb.root["grail_main_method_runs"]') = 1.
  check value: 'B: calling the methods left nothing to commit' value: System needsCommit not.
] on: AbstractException do: [:exception |
  failures add: 'B: raised ' , exception class name asString , ': ' ,
    ((exception messageText ifNil: ['']) asString copyFrom: 1
      to: (((exception messageText ifNil: ['']) asString size) min: 100)).
  exception return: nil].
System abort.
check value: 'B: and nothing was committed either'
  value: (answer value: 'gemdb.root["grail_main_method_runs"]') = 1.
System abort.
UserGlobals at: #'Grail_mainMethod_failures' put: failures asArray.
System commit.
failures do: [:each | out nextPutAll: 'FAIL '; nextPutAll: each; cr].
out nextPutAll: 'sessionB: '; print: failures size; nextPutAll: ' failure(s)'; cr.
%
logout

! ===========================================================================
! Session C -- the class still works; cleanup (always), then the verdict
! ===========================================================================
login
run
| out failures size script |
out := GsFile stdout.
failures := OrderedCollection withAll:
  (UserGlobals at: #'Grail_mainMethod_failures' ifAbsent: [#('C: no verdict recorded')]).
size := [(PythonTestCase new) eval: 'import gemdb
gemdb.root["grail_main_method_customer"].size()']
  on: AbstractException do: [:exception | exception return: exception messageText asString].
size = 3 ifFalse: [failures add: 'C: a later session still finds the class''s methods working'].
(PythonTestCase new) eval: 'import gemdb
for key in ("grail_main_method_runs", "grail_main_method_customer"):
    gemdb.root.pop(key, None)'.
script := UserGlobals at: #'Grail_mainMethod_script' ifAbsent: [nil].
script ifNotNil: [
  (GsFile existsOnServer: script) == true ifTrue: [GsFile removeServerFile: script]].
#(#'Grail_mainMethod_script' #'Grail_mainMethod_failures') do: [:key |
  UserGlobals removeKey: key ifAbsent: []].
System commit.
failures isEmpty
  ifTrue: [ExitClientError signal: 'main script method: all checks passed!' status: 0]
  ifFalse: [
    failures do: [:each | out nextPutAll: 'FAIL '; nextPutAll: each; cr].
    out nextPutAll: 'main script method had '; print: failures size;
      nextPutAll: ' failure(s) -- see above.'; cr.
    ExitClientError signal: 'main script method FAILED!' status: 1].
%
logout
