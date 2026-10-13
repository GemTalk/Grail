output pushnew runBodySubmoduleBindTest.out
! file tests/scripts/runBodySubmoduleBindTest.gs
!
! A warm-bound package imports the submodules its BODY imported (issue #1475).
!
! The warm bind does not run the package body, so neither did the body's
! imports: ``from . import api'' in __init__.py left grail_bodysub_pkg.api
! reachable as an attribute but missing from sys.modules, with its
! __session_init__ never run.  The bind now imports, through the ordinary
! path, each module of the package tree the body's import record names --
! including a sibling a submodule's own body imported.  This drives it across
! real commit / logout / login boundaries, which the SUnit suite cannot (it
! must not commit):
!
!   grail_bodysub_pkg/__init__.py   from . import api; from .sub import mod
!   grail_bodysub_pkg/api.py        from . import helper; counts its hook runs
!   grail_bodysub_pkg/helper.py     imported only by api
!   grail_bodysub_pkg/sub/mod.py    imported through sub
!   grail_bodysub_pkg/keep.py       imported by nothing
!
! Session A: write the files, import the package (cold), commit.
! Session B: binding the package imports api, helper, sub and sub.mod, runs
!   api's hook once, and leaves keep unimported -- as CPython's re-executed
!   body would.
! Session C: cleanup (registry snapshot restore, files), report the verdict.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! Session A -- write the package, import it cold, commit
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
| out dir pkgDir write pkg failures names |
out := GsFile stdout.
failures := OrderedCollection new.
names := #('grail_bodysub_pkg' 'grail_bodysub_pkg.api' 'grail_bodysub_pkg.helper'
  'grail_bodysub_pkg.sub' 'grail_bodysub_pkg.sub.mod' 'grail_bodysub_pkg.keep').
"SELF-HEAL: a run that stopped before session C leaves its deployment behind,
and this session would then warm-bind it instead of building it.  Forget it
and commit that, BEFORE the snapshot, so C's restore does not preserve it."
names do: [:n |
  importlib ___forgetCanonicalModule___: n.
  importlib removeModule: n].
System commit.
UserGlobals at: #'Grail_bodysub_snap' put: importlib ___canonicalRegistrySnapshot___.
dir := importlib grailDir , '/out/body_submodule_bind'.
pkgDir := dir , '/grail_bodysub_pkg'.
{ dir . pkgDir . pkgDir , '/sub' } do: [:d |
  (GsFile existsOnServer: d) == true ifFalse: [GsFile createServerDirectory: d]].
UserGlobals at: #'Grail_bodysub_dir' put: pkgDir.
write := [:name :src | | f |
  f := GsFile openWriteOnServer: pkgDir , '/' , name.
  f nextPutAll: src.
  f close].
write value: '__init__.py' value: 'from . import api
from .sub import mod
'.
write value: 'api.py' value: 'from . import helper
INITS = 0
def __session_init__():
    global INITS
    INITS += 1
'.
write value: 'helper.py' value: 'X = 1
'.
write value: 'sub/__init__.py' value: ''.
write value: 'sub/mod.py' value: 'VERSION = "v1"
'.
write value: 'keep.py' value: 'VERSION = "v1"
'.
importlib @env1:addSearchRoot: dir.
pkg := importlib loadModuleFromPath: pkgDir , '/__init__.py' name: 'grail_bodysub_pkg'.
(names copyFrom: 1 to: 5) do: [:n |
  (importlib @env1:lookupModule: n) isNil
    ifTrue: [failures add: 'A: the cold import registered ' , n]].
UserGlobals at: #'Grail_bodysub_pkg' put: pkg.
UserGlobals at: #'Grail_bodysub_inits' put:
  ((importlib @env1:lookupModule: 'grail_bodysub_pkg.api') @env1:___pyAttrLoad___: #INITS).
UserGlobals at: #'Grail_bodysub_failures' put: failures asArray.
System commit.
out nextPutAll: 'sessionA: deployed grail_bodysub_pkg, api INITS = ';
  print: (UserGlobals at: #'Grail_bodysub_inits'); cr.
%
logout

! ===========================================================================
! Session B -- binding the package imports what its body imported
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
| out pkgDir pkg failures imported missing api inits |
out := GsFile stdout.
failures := OrderedCollection withAll: (UserGlobals at: #'Grail_bodysub_failures').
pkgDir := UserGlobals at: #'Grail_bodysub_dir'.
importlib @env1:addSearchRoot: (pkgDir copyFrom: 1 to: pkgDir size - '/grail_bodysub_pkg' size).
pkg := importlib loadModuleFromPath: pkgDir , '/__init__.py' name: 'grail_bodysub_pkg'.
(pkg == (UserGlobals at: #'Grail_bodysub_pkg')) ifFalse: [failures add: 'B: the package bound warm'].
missing := #('grail_bodysub_pkg.api' 'grail_bodysub_pkg.helper' 'grail_bodysub_pkg.sub'
  'grail_bodysub_pkg.sub.mod') reject: [:n | (importlib @env1:lookupModule: n) notNil].
missing isEmpty ifFalse: [failures add: 'B: the body''s submodules are in sys.modules, but not ' , missing printString].
((importlib @env1:lookupModule: 'grail_bodysub_pkg.keep') isNil)
  ifFalse: [failures add: 'B: keep, which nothing imported, stays unimported'].
api := importlib @env1:lookupModule: 'grail_bodysub_pkg.api'.
inits := api isNil ifTrue: [nil] ifFalse: [api @env1:___pyAttrLoad___: #INITS].
(inits = ((UserGlobals at: #'Grail_bodysub_inits') + 1))
  ifFalse: [failures add: 'B: api''s __session_init__ ran once in this session (INITS ' , inits printString , ')'].
((pkg dynamicInstVarAt: #api) == api)
  ifFalse: [failures add: 'B: pkg.api is the module sys.modules holds'].
UserGlobals at: #'Grail_bodysub_failures' put: failures asArray.
System commit.
out nextPutAll: 'sessionB: missing '; nextPutAll: missing printString;
  nextPutAll: ', api INITS '; print: inits; cr.
%
logout

! ===========================================================================
! Session C -- cleanup (always), then report the recorded verdict
! ===========================================================================
login
run
| out failures pkgDir |
out := GsFile stdout.
failures := UserGlobals at: #'Grail_bodysub_failures' ifAbsent: [#('the run stopped before session A recorded anything')].
importlib ___canonicalRegistryRestore___:
  (UserGlobals at: #'Grail_bodysub_snap' ifAbsent: [importlib ___canonicalRegistrySnapshot___]).
pkgDir := UserGlobals at: #'Grail_bodysub_dir' ifAbsent: [nil].
pkgDir ifNotNil: [
  #('__init__.py' 'api.py' 'helper.py' 'sub/__init__.py' 'sub/mod.py' 'keep.py') do: [:n |
    GsFile removeServerFile: pkgDir , '/' , n]].
#( #'Grail_bodysub_snap' #'Grail_bodysub_dir' #'Grail_bodysub_pkg' #'Grail_bodysub_inits'
   #'Grail_bodysub_failures' ) do: [:k | UserGlobals removeKey: k ifAbsent: []].
System commit.
out cr.
failures isEmpty
  ifTrue: [
    out nextPutAll: 'Body submodule bind: all checks passed.'; cr.
    ExitClientError signal: 'Body submodule bind passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'Body submodule bind FAILED:'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
    ExitClientError signal: 'Body submodule bind failed!' status: 1].
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report -- fail loudly instead of exit 0.
exit 1
