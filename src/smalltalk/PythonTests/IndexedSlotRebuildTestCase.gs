! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'IndexedSlotRebuildTestCase'
  instVarNames: #( path )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
IndexedSlotRebuildTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! IndexedSlotRebuildTestCase
!
! AN EDIT THAT ADDS A SLOT -- INFERRED, WITH GRAIL_INFERRED_SLOTS ON, OR
! DECLARED IN __slots__, FLAG OR NO FLAG -- KEEPS THE CLASS IDENTITY AND EVERY
! INSTANCE, INCLUDING A SUBCLASS'S.
!
! A slot is a POSITION in the instance's indexed part
! (docs/Instance_Attribute_Indexed_Slots.md).  A class's layout only ever
! APPENDS, so an instance built before the edit is merely shorter than the
! class and reads the new name as unbound; a subclass that had already handed
! out the next position to a name of its own appends the parent's new name
! after it and gets its own accessor pair for it, so the parent's pair --
! compiled for the parent's position -- is never the one that answers on a
! subclass instance.  With named instVars the same edit could not grow the
! class and silently degraded the new name to dynamic storage.
!
! Two revisions of one module are written to a temp file and loaded in turn,
! the way tests/scripts/runCanonicalClassTest.gs does it; the flag is forced
! for the duration.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
IndexedSlotRebuildTestCase removeAllMethods.
IndexedSlotRebuildTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: IndexedSlotRebuildTestCase
setUp
	"Per-user path: several worktrees share /tmp on one machine."
	path := '/tmp/grail_indexed_slot_rebuild_' , System myUserProfile userId asString , '.py'.
	importlib ___inferredSlotsForce___: true
%

category: 'Grail-Setup'
method: IndexedSlotRebuildTestCase
tearDown
	importlib ___inferredSlotsForce___: false.
	importlib ___inferredSlotsInvalidate___.
	[GsFile removeServerFile: path] on: Error do: [:e | ].
	(importlib @env1:modules) removeKey: #'grail_indexed_slot_rebuild' ifAbsent: []
%

category: 'Grail-Private'
method: IndexedSlotRebuildTestCase
loadRevision: aSource
	| f |
	f := GsFile openWriteOnServer: path.
	f nextPutAll: aSource.
	f close.
	(importlib @env1:modules) removeKey: #'grail_indexed_slot_rebuild' ifAbsent: [].
	^ importlib loadModuleFromPath: path name: 'grail_indexed_slot_rebuild'
%

category: 'Grail-Private'
method: IndexedSlotRebuildTestCase
layoutOf: aClass
	^ (aClass perform: #'___pySlotLayout___' env: 1) asArray
%

category: 'Grail-Tests'
method: IndexedSlotRebuildTestCase
testParentGainsASlotUnderASubclassWithInstances
	| mod a1 b1 aInst bInst mod2 a2 b2 |
	mod := self loadRevision: 'class A:
    def __init__(self):
        self.a1 = 1

class B(A):
    def __init__(self):
        super().__init__()
        self.b1 = 7
'.
	a1 := mod @env1:A.
	b1 := mod @env1:B.
	aInst := a1 @env1:___pyCallValue___: { } kw: nil.
	bInst := b1 @env1:___pyCallValue___: { } kw: nil.
	self assert: (self layoutOf: a1) equals: #(#a1).
	self assert: (self layoutOf: b1) equals: #(#a1 #b1).
	self assert: (bInst @env1:___pyAttrLoad___: #b1) equals: 7.
	self assert: bInst _basicSize equals: 2.

	mod2 := self loadRevision: 'class A:
    def __init__(self):
        self.a1 = 1
        self.a2 = 2

    def set_a2(self, v):
        self.a2 = v

class B(A):
    def __init__(self):
        super().__init__()
        self.b1 = 7
'.
	a2 := mod2 @env1:A.
	b2 := mod2 @env1:B.
	self assert: a2 == a1 description: 'A keeps its identity when an inferred slot is added'.
	self assert: b2 == b1 description: 'B keeps its identity too'.
	self assert: (self layoutOf: a2) equals: #(#a1 #a2).
	self assert: (self layoutOf: b2) equals: #(#a1 #b1 #a2)
		description: 'B appends a2 after its own b1; nothing moves'.
	"B compiled its OWN pair for a2, at B's position; A's is at A's."
	self assert: (b2 whichClassIncludesSelector: #'___pyattr_a2___' environmentId: 1) == b2.
	self assert: (a2 whichClassIncludesSelector: #'___pyattr_a2___' environmentId: 1) == a2.
	self assert: (bInst @env1:___pySlotIndexFor___: #a2) equals: -3.
	self assert: (aInst @env1:___pySlotIndexFor___: #a2) equals: -2.
	"The pre-edit instances: the new name is unbound (AttributeError), the old
	ones read back, and a store through the NEW method lands at the right
	position without disturbing b1."
	self should: [bInst @env1:___pyAttrLoad___: #a2] raise: AttributeError.
	self assert: (bInst @env1:___pyAttrLoad___: #b1) equals: 7.
	bInst @env1:set_a2: 5.
	self assert: (bInst @env1:___pyAttrLoad___: #a2) equals: 5.
	self assert: (bInst @env1:___pyAttrLoad___: #b1) equals: 7.
	self assert: bInst _basicSize equals: 3.
	aInst @env1:set_a2: 9.
	self assert: (aInst @env1:___pyAttrLoad___: #a2) equals: 9.
	self assert: (aInst @env1:___pyAttrLoad___: #a1) equals: 1.
	"A fresh B under revision 2 assigns all three through __init__."
	bInst := b2 @env1:___pyCallValue___: { } kw: nil.
	self assert: ((bInst @env1:___pyAttrLoad___: #a2) = 2 and: [(bInst @env1:___pyAttrLoad___: #b1) = 7]).
	self assert: (bInst at: 3) equals: 2.
	self assert: (bInst at: 2) equals: 7
%

category: 'Grail-Tests'
method: IndexedSlotRebuildTestCase
testDeclaredSlotAddedOnRebuildKeepsIdentityAndInstances
	"The declared-__slots__ half, with the inferred-slot flag OFF so nothing
	here depends on it.  Revision 2 adds b to __slots__: the class keeps its
	identity (no named instVar to outgrow), b is appended to the layout, the
	pre-edit instance reads b as unbound, stores it at the new position on the
	first write, and stays strict throughout."
	| mod s inst mod2 s2 |
	importlib ___inferredSlotsForce___: false.
	mod := self loadRevision: 'class S:
    __slots__ = (''a'',)
    def __init__(self):
        self.a = 1
'.
	s := mod @env1:S.
	inst := s @env1:___pyCallValue___: { } kw: nil.
	self assert: s instVarNames isEmpty.
	self assert: (self layoutOf: s) equals: #(#a).
	self assert: (inst @env1:___pyAttrLoad___: #a) equals: 1.
	self assert: inst _basicSize equals: 1.
	mod2 := self loadRevision: 'class S:
    __slots__ = (''a'', ''b'')
    def __init__(self):
        self.a = 1
        self.b = 2

    def set_b(self, v):
        self.b = v
'.
	s2 := mod2 @env1:S.
	self assert: s2 == s description: 'S keeps its identity when a declared slot is added'.
	self assert: s2 instVarNames isEmpty.
	self assert: (self layoutOf: s2) equals: #(#a #b).
	self assert: (inst @env1:___pySlotIndexFor___: #b) equals: -2.
	self should: [inst @env1:___pyAttrLoad___: #b] raise: AttributeError.
	self assert: (inst @env1:___pyAttrLoad___: #a) equals: 1.
	inst @env1:set_b: 5.
	self assert: (inst @env1:___pyAttrLoad___: #b) equals: 5.
	self assert: (inst at: 2) equals: 5.
	self assert: inst _basicSize equals: 2.
	"Still strict: a name outside __slots__ is refused on the old instance and
	on a new one."
	self should: [inst @env1:___pyAttrStore___: #c put: 1] raise: AttributeError.
	inst := s2 @env1:___pyCallValue___: { } kw: nil.
	self assert: (inst at: 2) equals: 2.
	self should: [inst @env1:___pyAttrStore___: #c put: 1] raise: AttributeError.
	self should: [inst @env1:___pyAttrLoad___: #'__dict__'] raise: AttributeError
%

category: 'Grail-Tests'
method: IndexedSlotRebuildTestCase
testDroppedSlotKeepsItsPositionForTheNextName
	"Revision 2 no longer assigns x; y is appended, not moved into x's place,
	so an instance built under revision 1 still has its y where revision 2
	reads it.  (A tombstone that hides the dropped name from dir() is a later
	cut; the position is what matters for the instances.)"
	| mod c inst mod2 c2 |
	mod := self loadRevision: 'class C:
    def __init__(self):
        self.x = 10
        self.y = 20
'.
	c := mod @env1:C.
	inst := c @env1:___pyCallValue___: { } kw: nil.
	self assert: (self layoutOf: c) equals: #(#x #y).
	mod2 := self loadRevision: 'class C:
    def __init__(self):
        self.y = 20
        self.z = 30
'.
	c2 := mod2 @env1:C.
	self assert: c2 == c.
	self assert: (self layoutOf: c2) equals: #(#x #y #z).
	self assert: (inst @env1:___pyAttrLoad___: #y) equals: 20.
	self should: [inst @env1:___pyAttrLoad___: #z] raise: AttributeError.
	inst := c2 @env1:___pyCallValue___: { } kw: nil.
	self assert: (inst at: 2) equals: 20.
	self assert: (inst at: 3) equals: 30
%
