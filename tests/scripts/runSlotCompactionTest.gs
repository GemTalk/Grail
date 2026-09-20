output pushnew runSlotCompactionTest.out
! file tests/scripts/runSlotCompactionTest.gs
!
! Slot compaction across a commit + logout + login boundary
! (docs/Instance_Attribute_Indexed_Slots.md par.4 item 5).
!
! Why this lives outside the in-session SUnit suite: the maintenance entry
! point, object class >> ___grailCompactSlots___, scans the repository for
! the instances to move, and every repository scan the kernel offers aborts
! first -- so it needs a CLEAN transaction, which the suite (which must not
! commit) cannot give it.  IndexedSlotRebuildTestCase covers the same
! compaction over the session-only entry point; this script covers the
! committed path and the refusal in a dirty transaction.
!
! Session 1: import a fixture whose A declares __slots__ (x y z) and B(A)
! adds b1, commit an instance of each under UserGlobals keys, re-import a
! revision that drops x (A keeps its identity; x becomes the tombstone ~x),
! assert that compaction REFUSES while the session is dirty, commit, compact,
! commit.  Session 2: fresh login, fault the instances back through their
! keys alone (no import), and verify the compact layouts, the moved values,
! the shrunk sizes and the reads through the accessor pairs; then
! ensure:-restore the registries and remove the keys so the repository is
! left clean even if a check fails.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

! ===========================================================================
! slot compaction: Session 1 -- build, commit, drop a slot, compact, commit
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
| out path f mod a b aInst bInst report dirtyRefused |
out := GsFile stdout.
UserGlobals at: #'Grail_compact_snap' put: importlib ___canonicalRegistrySnapshot___.
path := '/tmp/grail_slot_compaction_' , System myUserProfile userId asString , '.py'.
UserGlobals at: #'Grail_compact_path' put: path.
f := GsFile openWriteOnServer: path.
f nextPutAll: 'class A:
    __slots__ = ("x", "y", "z")

    def __init__(self):
        self.x = 1
        self.y = 2
        self.z = 3


class B(A):
    __slots__ = ("b1",)

    def __init__(self):
        super().__init__()
        self.b1 = 7

    def set_b1(self, v):
        self.b1 = v
'.
f close.
(importlib @env1:modules) removeKey: #'grail_slot_compaction' ifAbsent: [].
mod := importlib loadModuleFromPath: path name: 'grail_slot_compaction'.
a := mod @env1:A.
b := mod @env1:B.
aInst := a @env1:___pyCallValue___: { } kw: nil.
bInst := b @env1:___pyCallValue___: { } kw: nil.
bInst _basicSize = 4 ifFalse: [^ self error: 'setup: B instance has ' , bInst _basicSize printString , ' slots, expected 4'].
UserGlobals at: #'Grail_compact_a' put: aInst.
UserGlobals at: #'Grail_compact_b' put: bInst.
System commit.
out cr; nextPutAll: 'session1: committed A and B instances'; cr.

"Revision 2 drops x from A's __slots__: identity kept, position 1 retired."
f := GsFile openWriteOnServer: path.
f nextPutAll: 'class A:
    __slots__ = ("y", "z")

    def __init__(self):
        self.y = 2
        self.z = 3


class B(A):
    __slots__ = ("b1",)

    def __init__(self):
        super().__init__()
        self.b1 = 7

    def set_b1(self, v):
        self.b1 = v
'.
f close.
(importlib @env1:modules) removeKey: #'grail_slot_compaction' ifAbsent: [].
mod := importlib loadModuleFromPath: path name: 'grail_slot_compaction'.
(mod @env1:A) == a ifFalse: [^ self error: 'setup: the rebuild re-minted A'].
((a perform: #'___pySlotLayout___' env: 1) asArray = #(#'~x' #y #z))
  ifFalse: [^ self error: 'setup: A layout after the drop is ' , (a perform: #'___pySlotLayout___' env: 1) printString].
((b perform: #'___pySlotLayout___' env: 1) asArray = #(#'~x' #y #z #b1))
  ifFalse: [^ self error: 'setup: B layout after the drop is ' , (b perform: #'___pySlotLayout___' env: 1) printString].

"The session is dirty (the re-import): the repository scan must refuse."
dirtyRefused := [a @env1:___grailCompactSlots___. false]
  on: ImproperOperation do: [:e | e return: true].
dirtyRefused ifFalse: [^ self error: 'compaction ran in a dirty transaction'].
System commit.
report := a @env1:___grailCompactSlots___.
System commit.
out nextPutAll: 'session1: compacted -> ' , report printString; cr.
(report at: 1) = 2 ifFalse: [^ self error: 'expected 2 layouts rewritten, got ' , report printString].
(report at: 2) >= 2 ifFalse: [^ self error: 'expected at least 2 instances moved, got ' , report printString].
%
logout

! ===========================================================================
! slot compaction: Session 2 -- fresh login, fault the instances, verify,
!                               clean up.
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
| out results failures check aInst bInst a b |
out := GsFile stdout.
results := OrderedCollection new.
failures := OrderedCollection new.
check := [:label :bool | bool ifTrue: [results add: label] ifFalse: [failures add: label]].
[
  aInst := UserGlobals at: #'Grail_compact_a'.
  bInst := UserGlobals at: #'Grail_compact_b'.
  a := aInst class.
  b := bInst class.
  check value: 'A layout is compact: (y z)'
    value: ((a perform: #'___pySlotLayout___' env: 1) asArray = #(#y #z)).
  check value: 'B layout is compact: (y z b1)'
    value: ((b perform: #'___pySlotLayout___' env: 1) asArray = #(#y #z #b1)).
  check value: 'the committed A instance shrank to 2 and its values moved down'
    value: (aInst _basicSize = 2 and: [(aInst at: 1) = 2 and: [(aInst at: 2) = 3]]).
  check value: 'the committed B instance shrank to 3 with b1 at 3'
    value: (bInst _basicSize = 3 and: [(bInst at: 3) = 7 and: [(bInst at: 1) = 2]]).
  check value: 'the index tables answer the new positions'
    value: ((aInst @env1:___pySlotIndexFor___: #y) = -1
      and: [(bInst @env1:___pySlotIndexFor___: #b1) = -3
      and: [(aInst @env1:___pySlotIndexFor___: #x) = 0]]).
  check value: 'attribute reads through the loader answer the moved values'
    value: ((aInst @env1:___pyAttrLoad___: #y) = 2
      and: [(aInst @env1:___pyAttrLoad___: #z) = 3
      and: [(bInst @env1:___pyAttrLoad___: #b1) = 7]]).
  check value: 'the dropped name reads as absent (AttributeError)'
    value: ([aInst @env1:___pyAttrLoad___: #x. false] on: AbstractException do: [:e | e return: true]).
  check value: 'B''s own b1 pair was recompiled at 3 (a store through the method lands there)'
    value: ([bInst @env1:set_b1: 8. (bInst at: 3) = 8] on: AbstractException do: [:e | e return: false]).
  check value: 'the pairs live where expected: b1 on B, y on A'
    value: ((b whichClassIncludesSelector: #'___pyattr_b1___' environmentId: 1) == b
      and: [(b whichClassIncludesSelector: #'___pyattr_y___' environmentId: 1) == a]).
] ensure: [
  importlib ___canonicalRegistryRestore___:
    (UserGlobals at: #'Grail_compact_snap' ifAbsent: [importlib ___canonicalRegistrySnapshot___]).
  [GsFile removeServerFile: (UserGlobals at: #'Grail_compact_path' ifAbsent: [''])] on: Error do: [:e | ].
  UserGlobals removeKey: #'Grail_compact_snap' ifAbsent: [].
  UserGlobals removeKey: #'Grail_compact_path' ifAbsent: [].
  UserGlobals removeKey: #'Grail_compact_a' ifAbsent: [].
  UserGlobals removeKey: #'Grail_compact_b' ifAbsent: [].
  System commit
].

out cr; cr.
failures isEmpty
  ifTrue: [
    out nextPutAll: 'Slot-compaction regressions: all checks passed.'; cr.
    ExitClientError signal: 'Slot-compaction regressions passed!' status: 0]
  ifFalse: [
    out nextPutAll: 'Slot-compaction regressions FAILED:'; cr.
    failures do: [:each | out nextPutAll: '  '; nextPutAll: each; cr].
    ExitClientError signal: 'Slot-compaction regressions failed!' status: 1].
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report -- fail loudly instead of exit 0.
exit 1
