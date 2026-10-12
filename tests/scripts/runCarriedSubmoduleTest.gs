output pushnew runCarriedSubmoduleTest.out
! file tests/scripts/runCarriedSubmoduleTest.gs
!
! A deployed package's CARRIED submodules are kept current (issue #1223).
!
! registerModule:with: binds a submodule onto its package, and a committed
! package keeps the binding.  So in a fresh gem ``import pkg; pkg.api''
! reached the committed ``pkg.api'' although nothing imported it, and an
! edited api.py was never noticed: no import ran its staleness check.  The
! package's own dependency record does not cover it either -- only the
! submodules the package BODY imports are recorded there.  This drives it
! across real commit / logout / login boundaries, which the SUnit suite
! cannot (it must not commit):
!
!   grail_carry_pkg/__init__.py   imports none of its submodules
!   grail_carry_pkg/api.py        edited in session C
!   grail_carry_pkg/sub/mod.py    edited in session C, reached through
!                                 grail_carry_pkg.sub, which is not
!   grail_carry_pkg/keep.py       never edited
!
! Session A: write the files, import the three submodules, keep a committed
!   reference to each instance, commit.
! Session B: binding the package alone rebuilds nothing, imports nothing and
!   writes nothing.
! Session C: edit api and sub.mod, bind the package alone.  Both rebuild into
!   their committed instances and are registered with the package between
!   them; keep is left alone.  Commit.
! Session D: nothing changed since C, so binding rebuilds nothing.
! Session E: break api.  Binding the package still succeeds -- the program
!   asked for the package -- and the import that does ask for api raises.
! Session F: cleanup (registry snapshot restore, files), report the verdict.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! Session A -- write v1, import the submodules, commit
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
| out dir pkgDir write load pkg failures |
out := GsFile stdout.
failures := OrderedCollection new.
"SELF-HEAL: a run that stopped before session F leaves its deployment behind,
and this session would then warm-bind it instead of building it.  Forget it
and commit that, BEFORE the snapshot, so F's restore does not preserve it."
#('grail_carry_pkg' 'grail_carry_pkg.api' 'grail_carry_pkg.sub'
  'grail_carry_pkg.sub.mod' 'grail_carry_pkg.keep') do: [:n |
  importlib ___forgetCanonicalModule___: n.
  importlib removeModule: n].
System commit.
UserGlobals at: #'Grail_carry_snap' put: importlib ___canonicalRegistrySnapshot___.
dir := importlib grailDir , '/out/carried_submodule'.
pkgDir := dir , '/grail_carry_pkg'.
{ dir . pkgDir . pkgDir , '/sub' } do: [:d |
  (GsFile existsOnServer: d) == true ifFalse: [GsFile createServerDirectory: d]].
UserGlobals at: #'Grail_carry_dir' put: pkgDir.
write := [:name :src | | f |
  f := GsFile openWriteOnServer: pkgDir , '/' , name.
  f nextPutAll: src.
  f close].
write value: '__init__.py' value: 'RUNS = globals().get("RUNS", 0) + 1
'.
write value: 'api.py' value: 'VERSION = "v1"
'.
write value: 'sub/__init__.py' value: ''.
write value: 'sub/mod.py' value: 'VERSION = "v1"
'.
write value: 'keep.py' value: 'VERSION = "v1"
'.
importlib @env1:addSearchRoot: dir.
load := [:name :file | importlib loadModuleFromPath: pkgDir , '/' , file name: name].
pkg := load value: 'grail_carry_pkg' value: '__init__.py'.
load value: 'grail_carry_pkg.api' value: 'api.py'.
load value: 'grail_carry_pkg.sub' value: 'sub/__init__.py'.
load value: 'grail_carry_pkg.sub.mod' value: 'sub/mod.py'.
load value: 'grail_carry_pkg.keep' value: 'keep.py'.
"The package carries what was imported under it."
((pkg dynamicInstVarAt: #api) == (importlib @env1:lookupModule: 'grail_carry_pkg.api'))
  ifFalse: [failures add: 'A: the package carries api'].
UserGlobals at: #'Grail_carry_pkg' put: pkg.
UserGlobals at: #'Grail_carry_api' put: (importlib @env1:lookupModule: 'grail_carry_pkg.api').
UserGlobals at: #'Grail_carry_mod' put: (importlib @env1:lookupModule: 'grail_carry_pkg.sub.mod').
UserGlobals at: #'Grail_carry_keep' put: (importlib @env1:lookupModule: 'grail_carry_pkg.keep').
UserGlobals at: #'Grail_carry_failures' put: failures asArray.
System commit.
out nextPutAll: 'sessionA: deployed grail_carry_pkg with api, sub.mod and keep'; cr.
%
logout

! ===========================================================================
! Session B -- nothing changed: binding the package writes nothing
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
| out pkgDir pkg modified failures imported |
out := GsFile stdout.
failures := OrderedCollection withAll: (UserGlobals at: #'Grail_carry_failures').
pkgDir := UserGlobals at: #'Grail_carry_dir'.
importlib @env1:addSearchRoot: (pkgDir copyFrom: 1 to: pkgDir size - '/grail_carry_pkg' size).
pkg := importlib loadModuleFromPath: pkgDir , '/__init__.py' name: 'grail_carry_pkg'.
modified := System _numPersistentObjsModified.
(pkg == (UserGlobals at: #'Grail_carry_pkg')) ifFalse: [failures add: 'B: the package bound warm'].
(modified = 0) ifFalse: [failures add: 'B: binding modified ' , modified printString , ' persistent objects'].
imported := #('grail_carry_pkg.api' 'grail_carry_pkg.sub' 'grail_carry_pkg.sub.mod' 'grail_carry_pkg.keep')
  select: [:n | (importlib @env1:lookupModule: n) notNil].
imported isEmpty ifFalse: [failures add: 'B: a current carried submodule was left unimported, but ' , imported printString , ' were imported'].
(((pkg dynamicInstVarAt: #api) @env1:___pyAttrLoad___: #VERSION) = 'v1')
  ifFalse: [failures add: 'B: pkg.api.VERSION = v1'].
UserGlobals at: #'Grail_carry_failures' put: failures asArray.
System commit.
out nextPutAll: 'sessionB: persistent objects modified '; nextPutAll: modified printString;
  nextPutAll: ', imported '; nextPutAll: imported printString; cr.
%
logout

! ===========================================================================
! Session C -- edit api and sub.mod; binding the package rebuilds both
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
| out pkgDir write pkg api mod failures versions imported |
out := GsFile stdout.
failures := OrderedCollection withAll: (UserGlobals at: #'Grail_carry_failures').
pkgDir := UserGlobals at: #'Grail_carry_dir'.
write := [:name :src | | f |
  f := GsFile openWriteOnServer: pkgDir , '/' , name.
  f nextPutAll: src.
  f close].
write value: 'api.py' value: 'VERSION = "v2"
NEW_NAME = 1
'.
write value: 'sub/mod.py' value: 'VERSION = "v2"
'.
importlib @env1:addSearchRoot: (pkgDir copyFrom: 1 to: pkgDir size - '/grail_carry_pkg' size).
pkg := importlib loadModuleFromPath: pkgDir , '/__init__.py' name: 'grail_carry_pkg'.
api := importlib @env1:lookupModule: 'grail_carry_pkg.api'.
mod := importlib @env1:lookupModule: 'grail_carry_pkg.sub.mod'.
"Nil here means the package bound warm and its carried submodule was never
judged.  Say so, then read on through the committed references so the
remaining checks still report."
api isNil ifTrue: [
  failures add: 'C: binding the package imported the edited api'.
  api := UserGlobals at: #'Grail_carry_api'].
mod isNil ifTrue: [
  failures add: 'C: binding the package imported the edited sub.mod'.
  mod := UserGlobals at: #'Grail_carry_mod'].
(pkg == (UserGlobals at: #'Grail_carry_pkg')) ifFalse: [failures add: 'C: the package kept its identity'].
(api == (UserGlobals at: #'Grail_carry_api')) ifFalse: [failures add: 'C: api was rebuilt INTO its committed instance'].
(mod == (UserGlobals at: #'Grail_carry_mod')) ifFalse: [failures add: 'C: sub.mod was rebuilt INTO its committed instance'].
versions := { (pkg dynamicInstVarAt: #api) @env1:___pyAttrLoad___: #VERSION .
  ((pkg dynamicInstVarAt: #sub) dynamicInstVarAt: #mod) @env1:___pyAttrLoad___: #VERSION }.
(versions = #('v2' 'v2')) ifFalse: [failures add: 'C: pkg.api and pkg.sub.mod read v2 (' , versions printString , ')'].
(([api @env1:___pyAttrLoad___: #NEW_NAME] on: AbstractException do: [:ex | ex return: nil]) = 1) ifFalse: [failures add: 'C: api has the name the edit added'].
"Parents first, as an import of the dotted name would."
(importlib @env1:lookupModule: 'grail_carry_pkg.sub') isNil
  ifTrue: [failures add: 'C: sub.mod''s package was imported with it'].
imported := (importlib @env1:lookupModule: 'grail_carry_pkg.keep') notNil.
imported ifTrue: [failures add: 'C: keep, which did not change, was left unimported'].
((pkg @env1:___pyAttrLoad___: #RUNS) = 1) ifFalse: [failures add: 'C: the unchanged package body did not re-run'].
UserGlobals at: #'Grail_carry_failures' put: failures asArray.
System commit.
out nextPutAll: 'sessionC: pkg.api, pkg.sub.mod read '; nextPutAll: versions printString; cr.
%
logout

! ===========================================================================
! Session D -- nothing changed since C: binding rebuilds nothing
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
| out pkgDir pkg modified failures imported |
out := GsFile stdout.
failures := OrderedCollection withAll: (UserGlobals at: #'Grail_carry_failures').
pkgDir := UserGlobals at: #'Grail_carry_dir'.
importlib @env1:addSearchRoot: (pkgDir copyFrom: 1 to: pkgDir size - '/grail_carry_pkg' size).
pkg := importlib loadModuleFromPath: pkgDir , '/__init__.py' name: 'grail_carry_pkg'.
modified := System _numPersistentObjsModified.
(modified = 0) ifFalse: [failures add: 'D: binding modified ' , modified printString , ' persistent objects'].
imported := #('grail_carry_pkg.api' 'grail_carry_pkg.sub' 'grail_carry_pkg.sub.mod' 'grail_carry_pkg.keep')
  select: [:n | (importlib @env1:lookupModule: n) notNil].
imported isEmpty ifFalse: [failures add: 'D: the committed rebuilds were current, but ' , imported printString , ' were imported'].
UserGlobals at: #'Grail_carry_failures' put: failures asArray.
System commit.
out nextPutAll: 'sessionD: persistent objects modified '; nextPutAll: modified printString;
  nextPutAll: ', imported '; nextPutAll: imported printString; cr.
%
logout

! ===========================================================================
! Session E -- a broken carried submodule fails its own import, not the
! package's
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
| out pkgDir f pkg failures raised |
out := GsFile stdout.
failures := OrderedCollection withAll: (UserGlobals at: #'Grail_carry_failures').
pkgDir := UserGlobals at: #'Grail_carry_dir'.
f := GsFile openWriteOnServer: pkgDir , '/api.py'.
f nextPutAll: 'VERSION = (
'.
f close.
importlib @env1:addSearchRoot: (pkgDir copyFrom: 1 to: pkgDir size - '/grail_carry_pkg' size).
pkg := [importlib loadModuleFromPath: pkgDir , '/__init__.py' name: 'grail_carry_pkg']
  on: AbstractException do: [:ex | ex return: nil].
pkg isNil ifTrue: [failures add: 'E: binding the package succeeded with api broken'].
raised := [importlib loadModuleFromPath: pkgDir , '/api.py' name: 'grail_carry_pkg.api'. nil]
  on: AbstractException do: [:ex | ex return: ex class name asString].
(raised = 'SyntaxError') ifFalse: [failures add: 'E: importing the broken api raised SyntaxError (' , raised printString , ')'].
UserGlobals at: #'Grail_carry_failures' put: failures asArray.
"The failed rebuild wrote in this transaction; none of it is kept."
System abort.
UserGlobals at: #'Grail_carry_failures' put: failures asArray.
System commit.
out nextPutAll: 'sessionE: importing the broken api raised '; nextPutAll: raised printString; cr.
%
logout

! ===========================================================================
! Session F -- cleanup (always), then report the recorded verdict
! ===========================================================================
login
run
| out failures pkgDir |
out := GsFile stdout.
failures := UserGlobals at: #'Grail_carry_failures' ifAbsent: [#('the run stopped before session A recorded anything')].
importlib ___canonicalRegistryRestore___:
  (UserGlobals at: #'Grail_carry_snap' ifAbsent: [importlib ___canonicalRegistrySnapshot___]).
pkgDir := UserGlobals at: #'Grail_carry_dir' ifAbsent: [nil].
pkgDir ifNotNil: [
  #('__init__.py' 'api.py' 'sub/__init__.py' 'sub/mod.py' 'keep.py') do: [:n |
    GsFile removeServerFile: pkgDir , '/' , n]].
#( #'Grail_carry_snap' #'Grail_carry_dir' #'Grail_carry_pkg' #'Grail_carry_api'
   #'Grail_carry_mod' #'Grail_carry_keep' #'Grail_carry_failures' ) do: [:k | UserGlobals removeKey: k ifAbsent: []].
System commit.
out cr.
failures isEmpty
  ifTrue: [
    out nextPutAll: 'Carried submodules: all checks passed.'; cr.
    ExitClientError signal: 'Carried submodules passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'Carried submodules FAILED:'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
    ExitClientError signal: 'Carried submodules failed!' status: 1].
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report -- fail loudly instead of exit 0.
exit 1
