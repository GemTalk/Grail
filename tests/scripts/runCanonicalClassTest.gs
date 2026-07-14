output pushnew runCanonicalClassTest.out
! file tests/scripts/runCanonicalClassTest.gs
!
! Phase-1 canonical-class regression (docs/Persistent_Modules_and_Classes.md).
!
! Why this lives outside the in-session SUnit suite: canonical-class reuse
! can only be observed across a commit + logout + login boundary, and the
! suite must not commit.
!
! Contract under test:
!   - the feature flag defaults to OFF in a fresh session (the codegen
!     detour through ___canonicalSubclassOf: is behaviour-neutral unless a
!     session opts in);
!   - with the flag ON: a module-level class minted during import is
!     registered canonically, and a RE-IMPORT IN A LATER SESSION returns the
!     SAME class object -- so a persisted instance's class and the freshly
!     imported class agree (isinstance works across sessions);
!   - the persisted instance still runs its methods in the later session.
!
! Session 1 enables the flag, imports the fixture, commits an instance under
! `Grail_canonical_test`; session 2 re-logs in, verifies, then ensure:-removes
! the UserGlobals keys (instance + registry) so the repository is left clean
! even if any check fails.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! canonical-classes: Session 1 -- flag on, import, commit an instance
! ===========================================================================
login
run
| dir |
(dir := System gemEnvironmentVariable: 'GRAIL_DIR') ifNil:[
  System gemEnvironmentVariable: 'GRAIL_DIR' put: (dir := GsFile serverCurrentDirectory)
].
importlib grailDir: dir
%
level 0
run
| out mod w |
out := GsFile stdout.

"The flag must default OFF -- a fresh session that has not opted in gets
the plain ___subclass___ behaviour.  Checked BEFORE enabling it below."
(importlib ___canonicalClassesEnabled___)
  ifTrue: [^ self error: 'setup: canonical-classes flag must default to OFF'].

importlib ___canonicalClassesEnabled___: true.
mod := importlib
  loadModuleFromPath: (importlib grailDir , '/tests/python/grail_persist_fixture.py')
  name: 'grail_persist_fixture'.
w := mod @env1:widget.
(w @env1:describe) = 'widget-3'
  ifFalse: [^ self error: 'setup: describe returned ' , (w @env1:describe) printString].
UserGlobals at: #'Grail_canonical_test' put: w.
System commit.
out cr; nextPutAll: 'session1: committed Widget instance + canonical registry'; cr.
%
logout

! ===========================================================================
! canonical-classes: Session 2 -- fresh login, re-import, verify reuse,
!                                 clean up.
! ===========================================================================
login
run
| dir |
(dir := System gemEnvironmentVariable: 'GRAIL_DIR') ifNil:[
  System gemEnvironmentVariable: 'GRAIL_DIR' put: (dir := GsFile serverCurrentDirectory)
].
importlib grailDir: dir
%
level 0
run
| out w results failures check mod2 freshWidget |
out := GsFile stdout.
results := OrderedCollection new.
failures := OrderedCollection new.
check := [:label :bool | bool ifTrue: [results add: label] ifFalse: [failures add: label]].

"Run the checks inside ensure: so the committed keys are always removed --
the repository is left clean even when a check fails."
[
  check value: 'flag defaults OFF in a fresh session'
    value: (importlib ___canonicalClassesEnabled___) not.
  importlib ___canonicalClassesEnabled___: true.

  w := UserGlobals at: #'Grail_canonical_test'.
  check value: 'committed instance faulted back' value: w notNil.
  check value: 'persisted instance still runs its method (describe = widget-3)'
    value: ((w @env1:describe) = 'widget-3').

  mod2 := importlib
    loadModuleFromPath: (importlib grailDir , '/tests/python/grail_persist_fixture.py')
    name: 'grail_persist_fixture'.
  freshWidget := mod2 @env1:Widget.
  check value: 'CANONICAL REUSE: re-imported class == committed instance class'
    value: (freshWidget == (w class)).

  "Phase-3 class-attr overlay: a RUNTIME class-attr store on the shared
  canonical class must land session-locally -- visible to reads, but the
  COMMITTED classInstVar slot untouched (this session's ensure-commit
  below therefore cannot leak it)."
  freshWidget @env1:___pyAttrStore___: 'size' put: 99.
  check value: 'overlay: runtime store visible (Cls.size = 99)'
    value: ((freshWidget @env1:___pyAttrLoad___: #'size') = 99).
  check value: 'overlay: committed slot untouched (getter still 3)'
    value: ((freshWidget perform: #'size' env: 1) = 3).

  "EDIT WORKFLOW: write a throwaway module, import it (cold -- hash
  recorded), commit an instance; then REWRITE the source with changed
  method behaviour and re-import.  The stale hash must force a rebuild
  that keeps the class IDENTITY (canonical reuse) while refreshing the
  methods -- so the change reaches the ALREADY-PERSISTED instance."
  [ | tmpPath f modA gadget modB |
  tmpPath := '/tmp/grail_canon_edit_test.py'.
  f := GsFile openWriteOnServer: tmpPath.
  f nextPutAll: 'class Gadget:
    def spin(self):
        return 1
gadget = Gadget()
'.
  f close.
  (importlib @env1:modules) removeKey: #'grail_canon_edit_test' ifAbsent: [].
  modA := importlib loadModuleFromPath: tmpPath name: 'grail_canon_edit_test'.
  gadget := modA @env1:gadget.
  check value: 'edit-flow setup: v1 spin() = 1' value: ((gadget @env1:spin) = 1).

  f := GsFile openWriteOnServer: tmpPath.
  f nextPutAll: 'class Gadget:
    def spin(self):
        return 2
gadget = Gadget()
'.
  f close.
  (importlib @env1:modules) removeKey: #'grail_canon_edit_test' ifAbsent: [].
  modB := importlib loadModuleFromPath: tmpPath name: 'grail_canon_edit_test'.
  check value: 'edit flow: stale hash rebuilds onto the SAME class identity'
    value: ((modB @env1:Gadget) == (gadget class)).
  check value: 'edit flow: updated method reaches the pre-edit instance (spin = 2)'
    value: ((gadget @env1:spin) = 2).
  GsFile removeServerFile: tmpPath.
  ] value.
] ensure: [
  UserGlobals removeKey: #'Grail_canonical_test' ifAbsent: [].
  UserGlobals removeKey: #'GrailCanonicalClasses' ifAbsent: [].
  UserGlobals removeKey: #'GrailCanonicalClassSet' ifAbsent: [].
  UserGlobals removeKey: #'GrailCanonicalModuleHashes' ifAbsent: [].
  "Phase-5: session 1's commit also swept the canonical MODULE instances
  (doc par.10) -- drop the registry so their graphs are collectible."
  UserGlobals removeKey: #'GrailCanonicalModules' ifAbsent: [].
  System commit
].

out cr; cr.
failures isEmpty
  ifTrue: [
    out nextPutAll: 'Canonical-class regressions: all checks passed.'; cr.
    ExitClientError signal: 'Canonical-class regressions passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'Canonical-class regressions FAILED:'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
    ExitClientError signal: 'Canonical-class regressions failed!' status: 1].
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report -- fail loudly instead of exit 0.
exit 1
