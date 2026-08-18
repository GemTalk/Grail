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

"Snapshot the canonical registries + PythonModules BEFORE any import so
session 2's cleanup removes exactly what this test adds -- a standing
framework deployment survives."
UserGlobals at: #'Grail_canonical_snap' put: importlib ___canonicalRegistrySnapshot___.

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
  tmpPath := (importlib grailTmpDir , '/canon_edit_test.py').
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

  "--- a DECORATOR's stores must survive the same edit-flow rebuild ---
  @dataclass stamps its class with setattr(cls, ...), which is a RUNTIME
  mechanism expressing a DEFINITIONAL intent.  ___pyAttrStore___ diverts a
  runtime store into the session overlay once the class is in the canonical
  set -- and the class IS in it on any rebuild, because the previous build
  registered it.  ___resetClassAttrOverlay___, emitted just after the guard,
  then wipes the overlay.  So on the second import the marker lands in a place
  that is cleared moments later, and the class stops being a dataclass.

  object >> ___classHolderAttrStore___ already warns about exactly this for a
  class-body method decorator, which is why THAT one calls it directly."
  [ | dcPath f modA modB isDC |
  dcPath := (importlib grailTmpDir , '/canon_dataclass_test.py').
  f := GsFile openWriteOnServer: dcPath.
  f nextPutAll: 'from dataclasses import dataclass, is_dataclass


@dataclass
class Point:
    x: int = 1
    y: int = 2

rev = 1
'.
  f close.
  (importlib @env1:modules) removeKey: #'grail_canon_dataclass_test' ifAbsent: [].
  modA := importlib loadModuleFromPath: dcPath name: 'grail_canon_dataclass_test'.
  isDC := [((modA @env1:Point) @env1:___pyAttrLoad___: #'__dataclass_fields__') notNil]
    on: AbstractException do: [:e | e return: false].
  check value: 'dataclass setup: first import stamps __dataclass_fields__'
    value: isDC.

  f := GsFile openWriteOnServer: dcPath.
  f nextPutAll: 'from dataclasses import dataclass, is_dataclass


@dataclass
class Point:
    x: int = 9
    y: int = 2

rev = 2
'.
  f close.
  (importlib @env1:modules) removeKey: #'grail_canon_dataclass_test' ifAbsent: [].
  modB := importlib loadModuleFromPath: dcPath name: 'grail_canon_dataclass_test'.
  isDC := [((modB @env1:Point) @env1:___pyAttrLoad___: #'__dataclass_fields__') notNil]
    on: AbstractException do: [:e | e return: false].
  check value: 'DECORATOR SURVIVES REBUILD: __dataclass_fields__ still present'
    value: isDC.
  "The second revision EDITS a default.  Without a difference this check cannot tell
  ``the decorator ran again and its stores survived'' from ``the previous
  build's stores are still sitting on the reused class'' -- the reused-class
  holder makes the stale answer look identical to the right one."
  check value: 'decorator re-ran: the class attribute itself is refreshed'
    value: ([((modB @env1:Point) @env1:___pyAttrLoad___: #'x') = 9]
      on: AbstractException do: [:e | e return: false]).
  check value: 'DECORATOR RE-RAN: rebuilt __init__ uses the EDITED default (x = 9)'
    value: ([((modB @env1:Point) @env1:___pyCallValue___: { } kw: nil) @env1:x = 9]
      on: AbstractException do: [:e | e return: false]).
  GsFile removeServerFile: dcPath.
  ] value.

  "--- an ENUM whose metaclass writes into the class, re-imported repeatedly ---
  Definition-time wiring plus a REUSED class object is the hybrid
  docs/Persistent_Modules_and_Classes.md par.9.1 warns about: the code is
  reused, the body is re-executed, and whatever the previous build left on the
  class is still there.  For an enum that mattered twice over, because
  ___grailBuildMembers: sweeps the class for member candidates beyond the names
  the body declared -- so it re-consumed its OWN previous members as values, and
  the enum oscillated:

      load 1  ['ID', 'NAME']
      load 2  ['ID', 'NAME', 'ID_DESC', 'NAME_DESC']   <- by accident
      load 3  TypeError: <MyEnum.ID_DESC: '-id'> is not a string

  The sweep now skips a value that is already a member of the class being
  built.  Repeated imports must therefore never raise, and must SETTLE.

  They now agree with the first as well.  That took the reuse-time namespace
  reset (importlib ___canonicalSubclassOf:, object
  ___grailResetClassNamespace___): load 1 used to leave ID_DESC on the reused
  class and load 2 promoted it to a member, so the two legitimately differed.
  An EARLIER attempt at the same thing -- resetting the holder on every class
  BUILD -- was measured and rejected because it destroyed @dataclass, whose
  setattr landed in the holder on the first import and in the
  (immediately wiped) overlay on the second.  What made the reset safe was
  fixing that first: a decorator's stores now reach the class being rebuilt
  (object ___classAttrOverlayStore___'s class-build mark), so the reset clears
  only what the rebuild puts back."
  [ | enumPath fh mods names load |
  enumPath := (importlib grailTmpDir , '/canon_enum_test.py').
  GsFile removeServerFile: enumPath.
  fh := GsFile openWriteOnServer: enumPath.
  fh nextPutAll: 'from enum import EnumMeta, StrEnum


class IDEnumMeta(EnumMeta):
    def __new__(metacls, cls, bases, classdict, **kwds):
        for name in list(classdict.member_names):
            classdict[name + "_DESC"] = "-" + classdict[name]
        return super().__new__(metacls, cls, bases, classdict, **kwds)


class IDEnum(StrEnum, metaclass=IDEnumMeta):
    pass


class MyEnum(IDEnum):
    ID = "id"
    NAME = "name"
'.
  fh close.
  mods := importlib @env1:modules.
  names := OrderedCollection new.
  load := [ | m cls |
    mods removeKey: #'grail_canon_enum_test' ifAbsent: [].
    m := importlib loadModuleFromPath: enumPath name: 'grail_canon_enum_test'.
    cls := m @env1:MyEnum.
    ((Enum @env1:___grailMembers: cls) collect: [:mem | (mem @env1:name) asString])
      asArray ].
  check value: 'enum + metaclass: five re-imports never raise'
    value: ([ 1 to: 5 do: [:i | names add: load value]. true ]
      on: AbstractException do: [:e | e return: false]).
  check value: 'enum + metaclass: repeated re-imports SETTLE (loads 3..5 agree)'
    value: (names size = 5
      and: [((names at: 3) = (names at: 4)) and: [(names at: 4) = (names at: 5)]]).
  "The stronger statement the namespace reset buys: EVERY load agrees, first
  included, and each is the two members the source declares -- so a re-import
  answers what CPython answers rather than merely converging on something."
  check value: 'ENUM + METACLASS: every load agrees with the FIRST'
    value: (names size = 5 and: [names allSatisfy: [:n | n = (names at: 1)]]).
  check value: 'enum + metaclass: and that answer is the source''s two members'
    value: (names notEmpty and: [(names at: 1) = #('ID' 'NAME')]).
  GsFile removeServerFile: enumPath.
  (importlib @env1:modules) removeKey: #'grail_canon_enum_test' ifAbsent: [].
  ] value.
  "--- an EDIT that DROPS or ADDS a class attribute ---
  Identity reuse is a hybrid: the class OBJECT is the one the previous body
  populated, the CODE is re-executed.  Neither half reconciles the class's
  attribute namespace with the new source, and the two directions failed
  differently.

  DROPPED: nothing removes the accessor pair or its slot value, so the class
  kept answering revision 1's value for a name revision 2 does not mention.
  ADDED: a class attribute needs a classInstVar slot on the metaclass, and a
  reused class cannot grow one (a metaclass is never modifiable), so the
  accessor did not compile and the WHOLE class came back as ``NameError: Grail
  could not compile this method (codegen gap)'.

  The reset handles the first; the second declines the reuse and re-mints,
  which costs identity but builds.  Both are checked against a class the edit
  KEEPS, so a reset that simply wiped everything would not pass either."
  [ | nsPath f modA modB clsA clsB |
  nsPath := (importlib grailTmpDir , '/canon_nsreset_test.py').
  f := GsFile openWriteOnServer: nsPath.
  f nextPutAll: 'class Shape:
    keep = 1
    doomed = 2

    def which(self):
        return "one"
'.
  f close.
  (importlib @env1:modules) removeKey: #'grail_canon_nsreset_test' ifAbsent: [].
  modA := importlib loadModuleFromPath: nsPath name: 'grail_canon_nsreset_test'.
  clsA := modA @env1:Shape.
  check value: 'nsreset setup: revision 1 defines both attributes'
    value: ([((clsA @env1:___pyAttrLoad___: #'keep') = 1)
      and: [(clsA @env1:___pyAttrLoad___: #'doomed') = 2]]
        on: AbstractException do: [:e | e return: false]).

  "Revision 2 DROPS ``doomed' and edits ``keep'.  The edit to ``keep' is what
  makes the check mean something: without it a stale answer and a rebuilt one
  are the same value."
  f := GsFile openWriteOnServer: nsPath.
  f nextPutAll: 'class Shape:
    keep = 99

    def which(self):
        return "two"
'.
  f close.
  (importlib @env1:modules) removeKey: #'grail_canon_nsreset_test' ifAbsent: [].
  modB := importlib loadModuleFromPath: nsPath name: 'grail_canon_nsreset_test'.
  clsB := modB @env1:Shape.
  check value: 'nsreset: dropping an attribute KEEPS the class identity'
    value: (clsA == clsB).
  check value: 'nsreset: the surviving attribute is REFRESHED (keep = 99)'
    value: ([(clsB @env1:___pyAttrLoad___: #'keep') = 99]
      on: AbstractException do: [:e | e return: false]).
  check value: 'NAMESPACE RESET: the dropped attribute is GONE (AttributeError)'
    value: ([clsB @env1:___pyAttrLoad___: #'doomed'. false]
      on: AbstractException do: [:e | e return: true]).
  check value: 'nsreset: the reused class still runs its refreshed method'
    value: ([((clsB @env1:___pyCallValue___: { } kw: nil) @env1:which) asString = 'two']
      on: AbstractException do: [:e | e return: false]).

  "Revision 3 ADDS an attribute.  No slot for it on the reused metaclass, so
  reuse is declined and the class re-mints -- identity is lost, and the build
  succeeds instead of raising the codegen-gap NameError."
  f := GsFile openWriteOnServer: nsPath.
  f nextPutAll: 'class Shape:
    keep = 99
    added = 7

    def which(self):
        return "three"
'.
  f close.
  (importlib @env1:modules) removeKey: #'grail_canon_nsreset_test' ifAbsent: [].
  clsA := clsB.
  modB := [importlib loadModuleFromPath: nsPath name: 'grail_canon_nsreset_test']
    on: AbstractException do: [:e | e return: nil].
  check value: 'ADDED ATTRIBUTE: the module still imports (no codegen-gap stub)'
    value: (modB notNil).
  clsB := modB isNil ifTrue: [nil] ifFalse: [modB @env1:Shape].
  check value: 'added attribute: reuse is declined, so the class RE-MINTS'
    value: (clsB notNil and: [(clsA == clsB) not]).
  check value: 'added attribute: it reads back, alongside the kept one'
    value: (clsB notNil and: [[((clsB @env1:___pyAttrLoad___: #'added') = 7)
      and: [(clsB @env1:___pyAttrLoad___: #'keep') = 99]]
        on: AbstractException do: [:e | e return: false]]).
  GsFile removeServerFile: nsPath.
  (importlib @env1:modules) removeKey: #'grail_canon_nsreset_test' ifAbsent: [].
  ] value.
] ensure: [
  "Surgical cleanup: restore the registries + PythonModules to session 1's
  pre-import snapshot (removes this test's fixture entries AND anything
  this session's own imports added), leaving any standing deployment
  intact."
  importlib ___canonicalRegistryRestore___:
    (UserGlobals at: #'Grail_canonical_snap' ifAbsent: [importlib ___canonicalRegistrySnapshot___]).
  UserGlobals removeKey: #'Grail_canonical_snap' ifAbsent: [].
  UserGlobals removeKey: #'Grail_canonical_test' ifAbsent: [].
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
