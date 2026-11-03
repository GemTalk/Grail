output pushnew runRuntimeCompileWritesTest.out
! file tests/scripts/runRuntimeCompileWritesTest.gs
!
! A runtime compile writes nothing it was not asked to (#1970).
!
! Grail compiles methods at runtime -- while it imports a module, runs one,
! builds a class or execs a string -- and not only at install.  An
! environment-0 compile through Behavior >> compileMethod:dictionaries:
! category:environmentId: also records a CHANGE STAMP: with the user's
! GsPackagePolicy enabled (every Grail user has one: the kernel extensions are
! session methods), GsPackage >> setStamp:forBehavior:forMethod: files the
! class in a COMMITTED dictionary of the user's session-method package.  So the
! session went dirty with nothing to commit, and a commit made the class
! persistent through the stamp.  #1861 found it for a module's __transient__
! readers; these are the rest, one script each:
!
!   rcw_class_transient.py  a class declaring __transient__ (object class >>
!                           ___grailInstallTransientAttrs___)
!   rcw_spill.py            a module past 255 globals (module class >>
!                           ___installSpilledGlobalReaders___)
!   rcw_cext.py             a C extension import (CPythonShim class >>
!                           ___buildDynamicModule:fromPath:methodNames:),
!                           skipped when lib/_grail_demo.so is not built
!   rcw_module_transient.py a module's __transient__ globals (#1861)
!   rcw_plain.py            the control: classes, slots, an enum, a
!                           dataclass, a property and a session-local store
!                           into a committed module
!
! Session 1 deploys rcw_deployed.py, which has both a class __transient__ and
! a spill, and commits: the deploy is a write, the stamp is not.  It also
! warms the stdlib the scripts import, so session 2 measures only them.
!
! Session 2 runs every script session-local TWICE (a first run and an
! unchanged re-run) and re-imports the deployed module, each from a clean
! transaction.  After each: gemstone.needs_commit is false, System
! _writtenObjects is empty, and the session-method package holds no new stamp.
! Then it cleans up.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! Session 1 -- write the scripts, warm their imports, deploy a module.
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
| out failures dir write spill pkgKeys stamps before mod |
out := GsFile stdout.
failures := OrderedCollection new.
dir := importlib grailDir , '/out'.
(GsFile existsOnServer: dir) == true ifFalse: [GsFile createServerDirectory: dir].
dir := dir , '/runtime_compile_writes'.
(GsFile existsOnServer: dir) == true ifFalse: [GsFile createServerDirectory: dir].
write := [:name :src | | f |
  f := GsFile openWriteOnServer: dir , '/' , name.
  f nextPutAll: src.
  f close].
"Three hundred globals: past GemStone's 255 dynamic instVars, so the rest spill."
spill := WriteStream on: String new.
1 to: 300 do: [:i | spill nextPutAll: 'g'; print: i; nextPutAll: ' = '; print: i; lf].
write value: 'rcw_plain.py' value: 'import dataclasses
import enum
import math

class Slotted:
    __slots__ = ("x",)
    def __init__(self):
        self.x = 1

class Color(enum.Enum):
    RED = 1

@dataclasses.dataclass
class Point:
    x: int = 0

class Prop:
    @property
    def p(self):
        return 2

math.grail_rcw_probe = 1
del math.grail_rcw_probe
result = (Slotted().x, Color.RED.value, Point(3).x, Prop().p)
'.
write value: 'rcw_class_transient.py' value: 'class Conn:
    __transient__ = ["sock"]
    def __init__(self):
        self.sock = "open"

result = Conn().sock
'.
write value: 'rcw_module_transient.py' value: '__transient__ = ["scratch"]
scratch = []
result = "ok"
'.
write value: 'rcw_spill.py' value: spill contents , 'result = g300
'.
write value: 'rcw_cext.py' value: 'try:
    import _grail_demo
except ImportError:
    _grail_demo = None
result = "skipped" if _grail_demo is None else type(_grail_demo.Vec()).__name__
'.
write value: 'rcw_deployed.py' value: spill contents , '
class Conn:
    __transient__ = ["sock"]
    def __init__(self):
        self.sock = "open"

def use():
    return (Conn().sock, g1, g300)
'.
UserGlobals at: #'Grail_rcw_dir' put: dir.
"The package's behaviors now, so the cleanup can drop whatever a failing run
stamps and commits."
GsPackagePolicy current packages_Do: [:p |
  pkgKeys := IdentitySet withAll: p sessionMethods keys].
UserGlobals at: #'Grail_rcw_pkgKeys' put: pkgKeys.
stamps := [| n |
  n := 0.
  GsPackagePolicy current packages_Do: [:p |
    p sessionMethods do: [:ar | (ar at: 3) do: [:d | n := n + d size]]].
  n].
"Warm the stdlib the control imports: a cold import is a write by design."
importlib runPath: dir , '/rcw_plain.py'.
System commitTransaction ifFalse: [failures add: '1: the warming commit failed'].
before := stamps value.
mod := importlib loadModuleFromPath: dir , '/rcw_deployed.py' name: 'rcw_deployed'.
(stamps value = before)
  ifFalse: [failures add: '1: deploying rcw_deployed.py (class __transient__, spilled globals) stamped '
    , (stamps value - before) printString , ' method(s)'].
System commitTransaction ifFalse: [failures add: '1: the deploy commit failed'].
UserGlobals at: #'Grail_rcw_failures' put: failures asArray.
failures do: [:each | out nextPutAll: '  FAIL  '; nextPutAll: each; cr].
System commit
%
logout

! ===========================================================================
! Session 2 -- every script, run and re-run, and a warm re-import, write
! nothing; then clean up.
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
| out failures check dir stamps measure gemstone pkgKeys |
out := GsFile stdout.
failures := OrderedCollection withAll: (UserGlobals at: #'Grail_rcw_failures' ifAbsent: [#('session 1 recorded nothing')]).
check := [:label :ok |
  ok
    ifTrue: [out nextPutAll: '  PASS  ', label; cr]
    ifFalse: [failures add: label. out nextPutAll: '  FAIL  ', label; cr]].
dir := UserGlobals at: #'Grail_rcw_dir'.
"Session-local, whatever the environment says."
System gemEnvironmentVariable: 'GEMDB_NAMESPACE' put: ''.
stamps := [| n |
  n := 0.
  GsPackagePolicy current packages_Do: [:p |
    p sessionMethods do: [:ar | (ar at: 3) do: [:d | n := n + d size]]].
  n].
"aBlock from a clean transaction; then it must have left none of the three."
measure := [:label :aBlock | | before written dirty |
  System abortTransaction.
  before := stamps value.
  aBlock value.
  written := System _writtenObjects ifNil: [#()].
  dirty := (gemstone @env1:___pyAttrLoad___: #'needs_commit') == true.
  check value: label , ': gemstone.needs_commit is false' value: dirty not.
  check value: label , ': System _writtenObjects is empty (' , (written collect: [:o | o class name]) asArray printString , ')'
    value: written isEmpty.
  check value: label , ': no change stamp' value: stamps value = before.
  System abortTransaction].
[
  gemstone := importlib @env1:lookupModule: 'gemstone'.
  #('rcw_plain.py' 'rcw_class_transient.py' 'rcw_module_transient.py' 'rcw_spill.py' 'rcw_cext.py') do: [:name |
    #('run' 're-run') do: [:which |
      measure value: name , ' ' , which value: [ | main r |
        main := importlib runPath: dir , '/' , name.
        r := main dynamicInstVarAt: #'result'.
        (name = 'rcw_cext.py' and: [r = 'skipped']) ifTrue: [
          out nextPutAll: '  SKIP  rcw_cext.py: lib/_grail_demo.so is not built'; cr]]]].
  measure value: 'rcw_deployed re-import' value: [ | mod |
    mod := importlib loadModuleFromPath: dir , '/rcw_deployed.py' name: 'rcw_deployed'.
    (mod @env1:___pyAttrLoad___: #use) @env1:___pyCallValue___: #() kw: nil].
] ensure: [
  System abortTransaction.
  importlib ___forgetCanonicalModule___: 'rcw_deployed'.
  "A failing run committed stamps: drop the behaviors session 1 did not see."
  pkgKeys := UserGlobals at: #'Grail_rcw_pkgKeys' ifAbsent: [nil].
  pkgKeys ifNotNil: [
    GsPackagePolicy current packages_Do: [:p |
      (p sessionMethods keys reject: [:k | pkgKeys includes: k]) do: [:k |
        p sessionMethods removeKey: k ifAbsent: []]]].
  #('rcw_plain.py' 'rcw_class_transient.py' 'rcw_module_transient.py' 'rcw_spill.py' 'rcw_cext.py' 'rcw_deployed.py') do: [:f |
    [GsFile removeServerFile: dir , '/' , f] on: Error do: [:e | e return: nil]].
  #(#'Grail_rcw_dir' #'Grail_rcw_pkgKeys' #'Grail_rcw_failures') do: [:k |
    UserGlobals removeKey: k ifAbsent: []].
  System commit].
failures isEmpty
  ifTrue: [
    out nextPutAll: 'Runtime compile writes: all checks passed.'; cr.
    ExitClientError signal: 'runtime compile writes passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'Runtime compile writes FAILED: '; print: failures size;
        nextPutAll: ' check(s):'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
    ExitClientError signal: 'runtime compile writes failed!' status: 1]
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report -- fail loudly instead of exit 0.
exit 1
