output pushnew runLazyBindStaleTest.out
! file tests/scripts/runLazyBindStaleTest.gs
!
! The LAZY FIRST-TOUCH bind never serves a stale module (issue #1805).
!
! Committed code reaches a module it did not import through
! ``module class >> instance'' (importlib class >>
! ___canonicalInstanceForModuleClass___:) -- a deployed Flask closure
! resolving contextvars' _MISSING while serving a request.  That path used to
! adopt the committed instance without asking whether it was current, so after
! an install that made it stale (D7) -- its redeploy skipped
! (GRAIL_NO_REDEPLOY=1) or failed -- it ran the previous install's compiled
! code against the new runtime.  It now rebuilds a stale module into its
! committed instance, as an import would, and refuses with an ImportError
! naming the module when that rebuild fails.  This drives it across real
! commit / logout / login boundaries, which the SUnit suite cannot:
!
!   grail_lazy_mod.py           a top-level module
!   grail_lazy_pkg/sub.py       a submodule, reached lazily with its package
!                               not imported either
!
! Each body counts its executions in RUNS, read back from the namespace it
! re-executes over: 1 after a fresh build, 2 after a rebuild IN PLACE.
!
! Session A: write the files, import both, keep committed references, commit.
! Session B: an install: bump GrailRuntimeGeneration as the post-load does,
!   with no redeploy after it.  Commit.
! Session C: reach both through ``instance'' alone.  Each is rebuilt into its
!   committed instance under the new generation and is current.  Commit.
! Session D: nothing changed since C: the lazy bind adopts, rebuilds nothing
!   and writes nothing.
! Session E: break grail_lazy_mod.  The lazy bind raises ImportError naming
!   the module, every time -- it never falls back to the stale build.
! Session F: cleanup (generation, registry snapshot restore, files), verdict.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! Session A -- write v1, import, commit
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
| out dir pkgDir write mod sub failures |
out := GsFile stdout.
failures := OrderedCollection new.
"SELF-HEAL: a run that stopped before session F leaves its deployment behind.
Forget it and commit that, BEFORE the snapshot, so F's restore does not
preserve it."
#('grail_lazy_mod' 'grail_lazy_pkg' 'grail_lazy_pkg.sub') do: [:n |
  importlib ___forgetCanonicalModule___: n.
  importlib removeModule: n].
System commit.
UserGlobals at: #'Grail_lazy_snap' put: importlib ___canonicalRegistrySnapshot___.
UserGlobals at: #'Grail_lazy_gen' put: (UserGlobals at: #'GrailRuntimeGeneration' otherwise: 0).
UserGlobals at: #'Grail_lazy_deployGen' put: (UserGlobals at: #'GrailCanonicalDeployGeneration' otherwise: nil).
dir := importlib grailDir , '/out/lazy_bind_stale'.
pkgDir := dir , '/grail_lazy_pkg'.
{ dir . pkgDir } do: [:d |
  (GsFile existsOnServer: d) == true ifFalse: [GsFile createServerDirectory: d]].
UserGlobals at: #'Grail_lazy_dir' put: dir.
write := [:name :src | | f |
  f := GsFile openWriteOnServer: dir , '/' , name.
  f nextPutAll: src.
  f close].
write value: 'grail_lazy_mod.py' value: 'RUNS = globals().get("RUNS", 0) + 1
def version():
    return "v1"
'.
write value: 'grail_lazy_pkg/__init__.py' value: ''.
write value: 'grail_lazy_pkg/sub.py' value: 'RUNS = globals().get("RUNS", 0) + 1
'.
importlib @env1:addSearchRoot: dir.
mod := importlib loadModuleFromPath: dir , '/grail_lazy_mod.py' name: 'grail_lazy_mod'.
importlib loadModuleFromPath: pkgDir , '/__init__.py' name: 'grail_lazy_pkg'.
sub := importlib loadModuleFromPath: pkgDir , '/sub.py' name: 'grail_lazy_pkg.sub'.
((mod @env1:___pyAttrLoad___: #RUNS) = 1) ifFalse: [failures add: 'A: grail_lazy_mod built once'].
UserGlobals at: #'Grail_lazy_mod' put: mod.
UserGlobals at: #'Grail_lazy_modClass' put: mod class.
UserGlobals at: #'Grail_lazy_sub' put: sub.
UserGlobals at: #'Grail_lazy_subClass' put: sub class.
UserGlobals at: #'Grail_lazy_failures' put: failures asArray.
System commit.
out nextPutAll: 'sessionA: deployed grail_lazy_mod and grail_lazy_pkg.sub'; cr.
%
logout

! ===========================================================================
! Session B -- an install bumps the runtime generation, and nothing redeploys
! ===========================================================================
login
run
UserGlobals at: #'GrailRuntimeGeneration'
  put: (UserGlobals at: #'GrailRuntimeGeneration' otherwise: 0) + 1.
System commit.
GsFile stdout nextPutAll: 'sessionB: GrailRuntimeGeneration is now ';
  nextPutAll: (UserGlobals at: #'GrailRuntimeGeneration') printString; cr.
%
logout

! ===========================================================================
! Session C -- reach both through ``instance'' alone: each is rebuilt in place
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
| out failures gen check runs |
out := GsFile stdout.
failures := OrderedCollection withAll: (UserGlobals at: #'Grail_lazy_failures').
importlib @env1:addSearchRoot: (UserGlobals at: #'Grail_lazy_dir').
gen := UserGlobals at: #'GrailRuntimeGeneration'.
runs := OrderedCollection new.
check := [:name :clsKey :instKey | | inst rec |
  inst := [(UserGlobals at: clsKey) @env1:instance]
    on: AbstractException do: [:ex |
      failures add: 'C: the lazy bind of ' , name , ' raised ' , ex class name , ': ' , ex messageText printString.
      ex return: nil].
  inst isNil ifFalse: [
    (inst == (UserGlobals at: instKey)) ifFalse: [failures add: 'C: ' , name , ' is its committed instance'].
    runs add: (inst @env1:___pyAttrLoad___: #RUNS).
    ((inst @env1:___pyAttrLoad___: #RUNS) = 2)
      ifFalse: [failures add: 'C: ' , name , ' was rebuilt in place (RUNS = ' , (inst @env1:___pyAttrLoad___: #RUNS) printString , ')'].
    rec := importlib ___canonicalModuleDeps___ ifNotNil: [:reg | reg at: name otherwise: nil].
    (rec notNil and: [rec size >= 3 and: [(rec at: 3) = gen]])
      ifFalse: [failures add: 'C: ' , name , ' records the new runtime generation (' , rec printString , ')'].
    (importlib ___isCurrentModule___: name) ifFalse: [failures add: 'C: ' , name , ' is current'].
    ((importlib @env1:lookupModule: name) == inst) ifFalse: [failures add: 'C: ' , name , ' is in sys.modules']]].
"The submodule first: its package is not imported either."
check value: 'grail_lazy_pkg.sub' value: #'Grail_lazy_subClass' value: #'Grail_lazy_sub'.
check value: 'grail_lazy_mod' value: #'Grail_lazy_modClass' value: #'Grail_lazy_mod'.
(((UserGlobals at: #'Grail_lazy_modClass') @env1:instance) @env1:___pyAttrLoad___: #RUNS) = 2
  ifFalse: [failures add: 'C: a second touch in the same session rebuilds nothing'].
UserGlobals at: #'Grail_lazy_failures' put: failures asArray.
System commit.
out nextPutAll: 'sessionC: RUNS after the lazy bind '; nextPutAll: runs asArray printString; cr.
%
logout

! ===========================================================================
! Session D -- nothing changed since C: the lazy bind adopts and writes nothing
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
| out failures inst modified |
out := GsFile stdout.
failures := OrderedCollection withAll: (UserGlobals at: #'Grail_lazy_failures').
inst := (UserGlobals at: #'Grail_lazy_modClass') @env1:instance.
modified := System _numPersistentObjsModified.
(inst == (UserGlobals at: #'Grail_lazy_mod')) ifFalse: [failures add: 'D: grail_lazy_mod adopted its committed instance'].
((inst @env1:___pyAttrLoad___: #RUNS) = 2) ifFalse: [failures add: 'D: a current module is not rebuilt'].
(modified = 0) ifFalse: [failures add: 'D: the lazy bind modified ' , modified printString , ' persistent objects'].
UserGlobals at: #'Grail_lazy_failures' put: failures asArray.
System commit.
out nextPutAll: 'sessionD: persistent objects modified '; nextPutAll: modified printString; cr.
%
logout

! ===========================================================================
! Session E -- a stale module whose rebuild fails is refused, not served
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
| out failures f touch first second |
out := GsFile stdout.
failures := OrderedCollection withAll: (UserGlobals at: #'Grail_lazy_failures').
f := GsFile openWriteOnServer: (UserGlobals at: #'Grail_lazy_dir') , '/grail_lazy_mod.py'.
f nextPutAll: 'RUNS = (
'.
f close.
touch := [[(UserGlobals at: #'Grail_lazy_modClass') @env1:instance. 'no error']
  on: AbstractException do: [:ex | ex return: ex class name asString , ': ' , ex messageText asString]].
first := touch value.
second := touch value.
((first beginsWith: 'ImportError') and: [(first includesString: 'grail_lazy_mod') and: [first includesString: 'stale']])
  ifFalse: [failures add: 'E: the failed lazy rebuild raised an ImportError naming the module (' , first , ')'].
(second beginsWith: 'ImportError')
  ifFalse: [failures add: 'E: a second touch is refused too, not served the stale build (' , second , ')'].
"The failed rebuild wrote in this transaction; none of it is kept."
System abort.
UserGlobals at: #'Grail_lazy_failures' put: failures asArray.
System commit.
out nextPutAll: 'sessionE: the lazy bind raised '; nextPutAll: first; cr.
%
logout

! ===========================================================================
! Session F -- cleanup (always), then report the recorded verdict
! ===========================================================================
login
run
| out failures dir |
out := GsFile stdout.
failures := UserGlobals at: #'Grail_lazy_failures' ifAbsent: [#('the run stopped before session A recorded anything')].
(UserGlobals includesKey: #'Grail_lazy_gen') ifTrue: [
  UserGlobals at: #'GrailRuntimeGeneration' put: (UserGlobals at: #'Grail_lazy_gen')].
(UserGlobals at: #'Grail_lazy_deployGen' ifAbsent: [nil]) ifNotNil: [:g |
  UserGlobals at: #'GrailCanonicalDeployGeneration' put: g].
importlib ___canonicalRegistryRestore___:
  (UserGlobals at: #'Grail_lazy_snap' ifAbsent: [importlib ___canonicalRegistrySnapshot___]).
dir := UserGlobals at: #'Grail_lazy_dir' ifAbsent: [nil].
dir ifNotNil: [
  #('grail_lazy_mod.py' 'grail_lazy_pkg/__init__.py' 'grail_lazy_pkg/sub.py') do: [:n |
    GsFile removeServerFile: dir , '/' , n]].
#( #'Grail_lazy_snap' #'Grail_lazy_gen' #'Grail_lazy_deployGen' #'Grail_lazy_dir'
   #'Grail_lazy_mod' #'Grail_lazy_modClass' #'Grail_lazy_sub' #'Grail_lazy_subClass'
   #'Grail_lazy_failures' ) do: [:k | UserGlobals removeKey: k ifAbsent: []].
System commit.
out cr.
failures isEmpty
  ifTrue: [
    out nextPutAll: 'Stale lazy bind: all checks passed.'; cr.
    ExitClientError signal: 'Stale lazy bind passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'Stale lazy bind FAILED:'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
    ExitClientError signal: 'Stale lazy bind failed!' status: 1].
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report -- fail loudly instead of exit 0.
exit 1
