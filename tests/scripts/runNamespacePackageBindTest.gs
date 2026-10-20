output pushnew runNamespacePackageBindTest.out
! file tests/scripts/runNamespacePackageBindTest.gs
!
! A deployed package's NAMESPACE subpackage binds without writing (#1239, #1667).
!
! A PEP 420 namespace package has no file and no source hash, so it never
! warm-binds.  A fresh session met one two ways, and each stored a NEW object
! on its COMMITTED parent, whose idempotence guard only skips a store of the
! identical child -- so the session needed a commit before it had changed
! anything, and two server gems doing the same import conflicted Write-Write:
!
!   * lookupModule:'s builtin fallback found the namespace package's class by
!     its underscored name, probed PythonModules with the DOTTED one, missed,
!     and answered a fresh instance of the class as if it were a builtin;
!   * an import that did reach ___loadNamespacePackage___ built a new one.
!
! It became every Flask user's problem when #1571 made a warm bind import the
! submodules a package's body imported: flask's body imports flask.sansio.*,
! and flask.sansio is the one namespace subpackage in the vendored tree, so a
! bare ``import flask'' on a deployed stone dirtied every fresh session (#1667).
!
!   grail_nsbind_pkg/__init__.py   from .ns import mod
!   grail_nsbind_pkg/ns/           NO __init__.py -- a namespace package
!   grail_nsbind_pkg/ns/mod.py     VALUE = 1
!
! Session A: write the files, import the package cold, commit.
! Session B: fresh.  The warm bind imports ns (as #1571 means it to) and the
!   session must still need no commit; ns must be the COMMITTED instance; a
!   direct ``import grail_nsbind_pkg.ns'' must write nothing either.
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
names := #('grail_nsbind_pkg' 'grail_nsbind_pkg.ns' 'grail_nsbind_pkg.ns.mod').
"SELF-HEAL: a run that stopped before session C leaves its deployment behind."
names do: [:name |
  importlib ___forgetCanonicalModule___: name.
  importlib removeModule: name].
System commit.
UserGlobals at: #'Grail_nsbind_snap' put: importlib ___canonicalRegistrySnapshot___.
dir := importlib grailDir , '/out/namespace_package_bind'.
pkgDir := dir , '/grail_nsbind_pkg'.
{ dir . pkgDir . pkgDir , '/ns' } do: [:each |
  (GsFile existsOnServer: each) == true ifFalse: [GsFile createServerDirectory: each]].
UserGlobals at: #'Grail_nsbind_dir' put: pkgDir.
write := [:name :source | | file |
  file := GsFile openWriteOnServer: pkgDir , '/' , name.
  file nextPutAll: source.
  file close].
write value: '__init__.py' value: 'from .ns import mod
'.
write value: 'ns/mod.py' value: 'VALUE = 1
'.
importlib @env1:addSearchRoot: dir.
pkg := importlib loadModuleFromPath: pkgDir , '/__init__.py' name: 'grail_nsbind_pkg'.
(importlib @env1:lookupModule: 'grail_nsbind_pkg.ns') isNil
  ifTrue: [failures add: 'A: the cold import registered the namespace subpackage'].
UserGlobals at: #'Grail_nsbind_pkg' put: pkg.
UserGlobals at: #'Grail_nsbind_ns' put: (importlib @env1:lookupModule: 'grail_nsbind_pkg.ns').
UserGlobals at: #'Grail_nsbind_failures' put: failures asArray.
System commit.
out nextPutAll: 'sessionA: deployed grail_nsbind_pkg with a namespace subpackage'; cr.
%
logout

! ===========================================================================
! Session B -- the warm bind of the package writes nothing
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
| out pkgDir pkg failures check namespacePackage |
out := GsFile stdout.
failures := OrderedCollection withAll: (UserGlobals at: #'Grail_nsbind_failures').
check := [:label :condition | condition ifFalse: [failures add: label]].
[
  pkgDir := UserGlobals at: #'Grail_nsbind_dir'.
  importlib @env1:addSearchRoot: (pkgDir copyFrom: 1 to: pkgDir size - '/grail_nsbind_pkg' size).
  check value: 'B: a fresh session starts with nothing to commit' value: System needsCommit not.
  pkg := importlib loadModuleFromPath: pkgDir , '/__init__.py' name: 'grail_nsbind_pkg'.
  check value: 'B: the package bound warm' value: pkg == (UserGlobals at: #'Grail_nsbind_pkg').
  namespacePackage := importlib @env1:lookupModule: 'grail_nsbind_pkg.ns'.
  check value: 'B: the warm bind imported the namespace subpackage (#1571)' value: namespacePackage notNil.
  check value: 'B: it is the COMMITTED namespace package, not a rebuilt one'
    value: namespacePackage == (UserGlobals at: #'Grail_nsbind_ns').
  check value: 'B: binding the package left nothing to commit (#1667)' value: System needsCommit not.
  (PythonTestCase new) eval: 'import grail_nsbind_pkg.ns'.
  check value: 'B: a direct import of the namespace subpackage left nothing to commit (#1239)'
    value: System needsCommit not.
  check value: 'B: its module is reachable through it'
    value: (((PythonTestCase new) eval: 'import grail_nsbind_pkg.ns.mod
grail_nsbind_pkg.ns.mod.VALUE') = 1)
] @env0:on: AbstractException do: [:exception |
  failures add: 'B: raised ' , exception class name asString , ': ' ,
    ((exception messageText ifNil: ['']) asString copyFrom: 1
      to: (((exception messageText ifNil: ['']) asString size) min: 100)).
  exception @env0:return: nil].
System abort.
UserGlobals at: #'Grail_nsbind_failures' put: failures asArray.
System commit.
failures do: [:each | out nextPutAll: 'FAIL '; nextPutAll: each; cr].
out nextPutAll: 'sessionB: '; print: failures size; nextPutAll: ' failure(s)'; cr.
%
logout

! ===========================================================================
! Session C -- cleanup (always), then the verdict
! ===========================================================================
login
run
| out failures pkgDir |
out := GsFile stdout.
failures := UserGlobals at: #'Grail_nsbind_failures' ifAbsent: [#('C: no verdict recorded')].
System abort.
#('grail_nsbind_pkg' 'grail_nsbind_pkg.ns' 'grail_nsbind_pkg.ns.mod') do: [:name |
  importlib ___forgetCanonicalModule___: name.
  importlib removeModule: name].
importlib ___canonicalRegistryRestore___:
  (UserGlobals at: #'Grail_nsbind_snap' ifAbsent: [importlib ___canonicalRegistrySnapshot___]).
pkgDir := UserGlobals at: #'Grail_nsbind_dir' ifAbsent: [nil].
pkgDir ifNotNil: [
  { pkgDir , '/ns/mod.py' . pkgDir , '/__init__.py' } do: [:each |
    (GsFile existsOnServer: each) == true ifTrue: [GsFile removeServerFile: each]]].
#(#'Grail_nsbind_snap' #'Grail_nsbind_dir' #'Grail_nsbind_pkg' #'Grail_nsbind_ns'
  #'Grail_nsbind_failures' #'GrailPersistentModuleState') do: [:key |
    UserGlobals removeKey: key ifAbsent: []].
System commit.
failures isEmpty
  ifTrue: [ExitClientError signal: 'namespace package bind: all checks passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'namespace package bind had '; print: failures size;
      nextPutAll: ' failure(s) -- see above.'; cr.
    ExitClientError signal: 'namespace package bind FAILED!' status: 1].
%
logout
