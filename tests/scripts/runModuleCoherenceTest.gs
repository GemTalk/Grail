output pushnew runModuleCoherenceTest.out
! file tests/scripts/runModuleCoherenceTest.gs
!
! A deployed module stays COHERENT with what it imported, across sessions
! (docs/Persistent_Modules_and_Classes.md par.4.4).
!
! The source hash decides whether a deployed module's committed instance is
! reused, but it covers only the module's own file.  A body also captures
! values out of what it imports, so a module whose own source is unchanged is
! stale when a dependency changed; and a stale deployed module rebuilt into a
! NEW instance splits in two -- new methods over the old globals, while every
! committed reference keeps the old instance.  This drives both across real
! commit / logout / login boundaries, which the SUnit suite cannot (it must
! not commit):
!
!   leaf  <-  mid (``import leaf'', ``from leaf import VALUE as CAPTURED'',
!                  ``DOUBLED = leaf.VALUE * 2'')  <-  top (``import mid'')
!
! Each body counts its own executions in RUNS, read back from the namespace
! it re-executes over: 1 after a fresh build, 2 after a rebuild IN PLACE.
!
! Session A: write the three files, import top cold, keep a committed
!   reference to each instance, commit.
! Session B: a warm import rebuilds nothing and writes nothing (par.9
!   invariant 1: zero persistent objects modified).
! Session C: edit ONLY leaf, import top.  All three rebuild, each into its
!   committed instance (identity), and mid's captured values follow leaf.
!   Commit.
! Session D: nothing changed since C, so a warm import rebuilds nothing --
!   the dependency record converged instead of churning.
! Session E: cleanup (registry snapshot restore, files), report the verdict.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! Session A -- write v1, cold import, commit
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
| out dir write top mid leaf failures rec |
out := GsFile stdout.
failures := OrderedCollection new.
"SELF-HEAL: a run that stopped before session E leaves its deployment behind,
and this session would then warm-bind it instead of building it.  Forget it
and commit that, BEFORE the snapshot, so E's restore does not preserve it."
#('grail_coh_top' 'grail_coh_mid' 'grail_coh_leaf') do: [:n |
  importlib ___forgetCanonicalModule___: n.
  importlib removeModule: n].
System commit.
UserGlobals at: #'Grail_coh_snap' put: importlib ___canonicalRegistrySnapshot___.
dir := importlib grailDir , '/out/module_coherence'.
(GsFile existsOnServer: dir) == true ifFalse: [GsFile createServerDirectory: dir].
UserGlobals at: #'Grail_coh_dir' put: dir.
write := [:name :src | | f |
  f := GsFile openWriteOnServer: dir , '/' , name , '.py'.
  f nextPutAll: src.
  f close].
write value: 'grail_coh_leaf' value:
'RUNS = globals().get("RUNS", 0) + 1
VALUE = 1
def version():
    return "v1"
'.
write value: 'grail_coh_mid' value:
'import grail_coh_leaf
from grail_coh_leaf import VALUE as CAPTURED
RUNS = globals().get("RUNS", 0) + 1
DOUBLED = grail_coh_leaf.VALUE * 2
'.
write value: 'grail_coh_top' value:
'import grail_coh_mid
RUNS = globals().get("RUNS", 0) + 1
def leaf_version():
    return grail_coh_mid.grail_coh_leaf.version()
'.
importlib @env1:addSearchRoot: dir.
top := importlib loadModuleFromPath: dir , '/grail_coh_top.py' name: 'grail_coh_top'.
mid := importlib @env1:lookupModule: 'grail_coh_mid'.
leaf := importlib @env1:lookupModule: 'grail_coh_leaf'.
(mid notNil and: [leaf notNil]) ifFalse: [failures add: 'A: mid and leaf were imported'].
((mid @env1:___pyAttrLoad___: #CAPTURED) = 1) ifFalse: [failures add: 'A: cold mid.CAPTURED = 1'].
rec := importlib ___canonicalModuleDeps___ ifNotNil: [:reg | reg at: 'grail_coh_mid' otherwise: nil].
(rec notNil and: [((rec at: 2) detect: [:pair | (pair at: 1) = 'grail_coh_leaf'] ifNone: [nil]) notNil])
  ifFalse: [failures add: 'A: mid''s dependency record names leaf'].
UserGlobals at: #'Grail_coh_top' put: top.
UserGlobals at: #'Grail_coh_mid' put: mid.
UserGlobals at: #'Grail_coh_leaf' put: leaf.
UserGlobals at: #'Grail_coh_failures' put: failures asArray.
System commit.
out nextPutAll: 'sessionA: deployed leaf <- mid <- top'; cr.
%
logout

! ===========================================================================
! Session B -- warm import: nothing rebuilds, nothing is written
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
| out dir top modified failures runs |
out := GsFile stdout.
failures := OrderedCollection withAll: (UserGlobals at: #'Grail_coh_failures').
dir := UserGlobals at: #'Grail_coh_dir'.
importlib @env1:addSearchRoot: dir.
top := importlib loadModuleFromPath: dir , '/grail_coh_top.py' name: 'grail_coh_top'.
modified := System _numPersistentObjsModified.
(top == (UserGlobals at: #'Grail_coh_top')) ifFalse: [failures add: 'B: warm import bound the committed top'].
runs := { #'Grail_coh_top' . #'Grail_coh_mid' . #'Grail_coh_leaf' } collect: [:k |
  (UserGlobals at: k) @env1:___pyAttrLoad___: #RUNS].
(runs = #(1 1 1)) ifFalse: [failures add: 'B: no body re-ran (RUNS ' , runs printString , ')'].
(modified = 0) ifFalse: [failures add: 'B: the warm import modified ' , modified printString , ' persistent objects'].
UserGlobals at: #'Grail_coh_failures' put: failures asArray.
System commit.
out nextPutAll: 'sessionB: RUNS '; nextPutAll: runs printString; nextPutAll: ', persistent objects modified '; nextPutAll: modified printString; cr.
%
logout

! ===========================================================================
! Session C -- edit ONLY leaf; top, mid and leaf rebuild in place
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
| out dir f top mid leaf failures runs version |
out := GsFile stdout.
failures := OrderedCollection withAll: (UserGlobals at: #'Grail_coh_failures').
dir := UserGlobals at: #'Grail_coh_dir'.
f := GsFile openWriteOnServer: dir , '/grail_coh_leaf.py'.
f nextPutAll:
'RUNS = globals().get("RUNS", 0) + 1
VALUE = 5
def version():
    return "v2"
'.
f close.
importlib @env1:addSearchRoot: dir.
top := importlib loadModuleFromPath: dir , '/grail_coh_top.py' name: 'grail_coh_top'.
mid := importlib @env1:lookupModule: 'grail_coh_mid'.
leaf := importlib @env1:lookupModule: 'grail_coh_leaf'.
"Nil here means top bound warm and never re-imported what is under it: the
changed dependency went unnoticed.  Say so, then read on through the
committed references so the remaining checks still report."
mid isNil ifTrue: [
  failures add: 'C: the edit below top made it stale (mid was re-imported)'.
  mid := UserGlobals at: #'Grail_coh_mid'].
leaf isNil ifTrue: [
  failures add: 'C: the edit below top made it stale (leaf was re-imported)'.
  leaf := UserGlobals at: #'Grail_coh_leaf'].
(top == (UserGlobals at: #'Grail_coh_top')) ifFalse: [failures add: 'C: top kept its identity'].
(mid == (UserGlobals at: #'Grail_coh_mid')) ifFalse: [failures add: 'C: mid was rebuilt INTO its committed instance'].
(leaf == (UserGlobals at: #'Grail_coh_leaf')) ifFalse: [failures add: 'C: leaf was rebuilt INTO its committed instance'].
runs := { top . mid . leaf } collect: [:m | m @env1:___pyAttrLoad___: #RUNS].
(runs = #(2 2 2)) ifFalse: [failures add: 'C: every module above the edit re-ran, in place (RUNS ' , runs printString , ')'].
(((UserGlobals at: #'Grail_coh_leaf') @env1:___pyAttrLoad___: #VALUE) = 5)
  ifFalse: [failures add: 'C: the committed leaf reference sees VALUE = 5'].
((mid @env1:___pyAttrLoad___: #CAPTURED) = 5)
  ifFalse: [failures add: 'C: mid''s from-import capture followed leaf (CAPTURED = 5)'].
((mid @env1:___pyAttrLoad___: #DOUBLED) = 10)
  ifFalse: [failures add: 'C: mid''s computed capture followed leaf (DOUBLED = 10)'].
version := (top @env1:___pyAttrLoad___: #leaf_version) @env1:___pyCallValue___: #() kw: nil.
(version = 'v2') ifFalse: [failures add: 'C: top reaches leaf v2 (' , version printString , ')'].
UserGlobals at: #'Grail_coh_failures' put: failures asArray.
System commit.
out nextPutAll: 'sessionC: RUNS '; nextPutAll: runs printString; nextPutAll: ', leaf_version '; nextPutAll: version printString; cr.
%
logout

! ===========================================================================
! Session D -- nothing changed since C: warm again, no churn
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
| out dir top modified failures runs |
out := GsFile stdout.
failures := OrderedCollection withAll: (UserGlobals at: #'Grail_coh_failures').
dir := UserGlobals at: #'Grail_coh_dir'.
importlib @env1:addSearchRoot: dir.
top := importlib loadModuleFromPath: dir , '/grail_coh_top.py' name: 'grail_coh_top'.
modified := System _numPersistentObjsModified.
runs := { #'Grail_coh_top' . #'Grail_coh_mid' . #'Grail_coh_leaf' } collect: [:k |
  (UserGlobals at: k) @env1:___pyAttrLoad___: #RUNS].
(runs = #(2 2 2)) ifFalse: [failures add: 'D: nothing re-ran after the rebuild was committed (RUNS ' , runs printString , ')'].
(modified = 0) ifFalse: [failures add: 'D: the warm import modified ' , modified printString , ' persistent objects'].
UserGlobals at: #'Grail_coh_failures' put: failures asArray.
System commit.
out nextPutAll: 'sessionD: RUNS '; nextPutAll: runs printString; nextPutAll: ', persistent objects modified '; nextPutAll: modified printString; cr.
%
logout

! ===========================================================================
! Session E -- cleanup (always), then report the recorded verdict
! ===========================================================================
login
run
| out failures dir |
out := GsFile stdout.
failures := UserGlobals at: #'Grail_coh_failures' ifAbsent: [#('the run stopped before session A recorded anything')].
importlib ___canonicalRegistryRestore___:
  (UserGlobals at: #'Grail_coh_snap' ifAbsent: [importlib ___canonicalRegistrySnapshot___]).
dir := UserGlobals at: #'Grail_coh_dir' ifAbsent: [nil].
dir ifNotNil: [
  #('grail_coh_leaf' 'grail_coh_mid' 'grail_coh_top') do: [:n |
    GsFile removeServerFile: dir , '/' , n , '.py']].
#( #'Grail_coh_snap' #'Grail_coh_dir' #'Grail_coh_top' #'Grail_coh_mid'
   #'Grail_coh_leaf' #'Grail_coh_failures' ) do: [:k | UserGlobals removeKey: k ifAbsent: []].
System commit.
out cr.
failures isEmpty
  ifTrue: [
    out nextPutAll: 'Module coherence: all checks passed.'; cr.
    ExitClientError signal: 'Module coherence passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'Module coherence FAILED:'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
    ExitClientError signal: 'Module coherence failed!' status: 1].
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report -- fail loudly instead of exit 0.
exit 1
