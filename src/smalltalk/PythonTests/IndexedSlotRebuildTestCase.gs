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
	self ___forgetCanonicalModule___: 'grail_indexed_slot_rebuild'.
	importlib ___inferredSlotsForce___: true
%

category: 'Grail-Setup'
method: IndexedSlotRebuildTestCase
tearDown
	"Forget the module's canonical-class entries too: identity reuse would
	otherwise carry one test's class -- and its LAYOUT, which no rebuild reset
	clears -- into the next test that spells a class the same way."
	importlib ___inferredSlotsForce___: false.
	importlib ___inferredSlotsInvalidate___.
	[GsFile removeServerFile: path] on: Error do: [:e | ].
	(importlib @env1:modules) removeKey: #'grail_indexed_slot_rebuild' ifAbsent: [].
	self ___forgetCanonicalModule___: 'grail_indexed_slot_rebuild'
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
testCompactionFreesHolesAndMovesInstances
	"The explicit maintenance operation.  A(x y z) with B(A) adding b1; a
	revision stops assigning x and an explicit drop turns it into the hole
	``~x'' at position 1 in both layouts.  Compacting
	A rewrites A to (y z) and B to (y z b1), moves every existing instance's
	values down one position and shrinks it, recompiles the index tables and
	the pairs -- B's own b1 pair now reads 3 -- and a fresh instance is built
	to the compact layout.  Nothing here is committed, and a repository scan
	refuses in a dirty transaction, so this is the SESSION-ONLY entry point over
	the same compaction; tests/scripts/runSlotCompactionTest.gs drives the
	committing one."
	| mod a b aInst bInst mod2 a2 b2 report |
	mod := self loadRevision: 'class A:
    def __init__(self):
        self.x = 1
        self.y = 2
        self.z = 3

class B(A):
    def __init__(self):
        super().__init__()
        self.b1 = 7

    def set_b1(self, v):
        self.b1 = v
'.
	a := mod @env1:A. b := mod @env1:B.
	aInst := a @env1:___pyCallValue___: { } kw: nil.
	bInst := b @env1:___pyCallValue___: { } kw: nil.
	self assert: bInst _basicSize equals: 4.
	mod2 := self loadRevision: 'class A:
    def __init__(self):
        self.y = 2
        self.z = 3

class B(A):
    def __init__(self):
        super().__init__()
        self.b1 = 7

    def set_b1(self, v):
        self.b1 = v
'.
	a2 := mod2 @env1:A. b2 := mod2 @env1:B.
	self assert: (a2 == a and: [b2 == b]).
	"The edit retires nothing: x survives in both layouts and the instances
	still hold it.  The explicit DROP makes the hole, nilling both."
	self assert: (self layoutOf: a2) equals: #(#x #y #z).
	self assert: (self layoutOf: b2) equals: #(#x #y #z #b1).
	self assert: (aInst @env1:___pyAttrLoad___: #x) equals: 1.
	report := a2 @env1:___grailDropSlotSessionOnly___: #x.
	self assert: (report at: 1) equals: 2 description: 'both layouts hold the hole'.
	self assert: (report at: 2) equals: 2 description: 'both instances cleared'.
	self assert: (self layoutOf: a2) equals: #(#'~x' #y #z).
	self assert: (self layoutOf: b2) equals: #(#'~x' #y #z #b1).
	self assert: (aInst at: 1) isNil.
	self should: [aInst @env1:___pyAttrLoad___: #x] raise: AttributeError.
	report := a2 @env1:___grailCompactSlotsSessionOnly___.
	self assert: (report at: 1) equals: 2 description: 'both layouts rewritten'.
	self assert: (report at: 2) >= 2 description: 'both instances moved'.
	self assert: (self layoutOf: a2) equals: #(#y #z).
	self assert: (self layoutOf: b2) equals: #(#y #z #b1).
	self assert: aInst _basicSize equals: 2.
	self assert: (aInst at: 1) equals: 2.
	self assert: (aInst at: 2) equals: 3.
	self assert: bInst _basicSize equals: 3.
	self assert: (bInst at: 3) equals: 7.
	self assert: (aInst @env1:___pySlotIndexFor___: #y) equals: -1.
	self assert: (bInst @env1:___pySlotIndexFor___: #b1) equals: -3.
	self assert: (aInst @env1:___pyAttrLoad___: #y) equals: 2.
	self assert: (aInst @env1:___pyAttrLoad___: #z) equals: 3.
	self assert: (bInst @env1:___pyAttrLoad___: #y) equals: 2.
	self assert: (bInst @env1:___pyAttrLoad___: #b1) equals: 7.
	self should: [aInst @env1:___pyAttrLoad___: #x] raise: AttributeError.
	"The pairs read the new positions: A's y pair, and B's own b1 pair."
	bInst @env1:set_b1: 8.
	self assert: (bInst @env1:___pyAttrLoad___: #b1) equals: 8.
	self assert: (bInst at: 3) equals: 8.
	self assert: (b2 whichClassIncludesSelector: #'___pyattr_b1___' environmentId: 1) == b2.
	self assert: (b2 whichClassIncludesSelector: #'___pyattr_y___' environmentId: 1) == a2.
	"A fresh instance is built to the compact layout."
	bInst := b2 @env1:___pyCallValue___: { } kw: nil.
	self assert: bInst _basicSize equals: 3.
	self assert: (bInst at: 1) equals: 2.
	self assert: (bInst at: 3) equals: 7
%

category: 'Grail-Tests'
method: IndexedSlotRebuildTestCase
testUnassignedSlotSurvives
	"Revision 2 no longer assigns x.  Nothing is retired: x keeps its position,
	its pair and its index entry, the old instance still reads 10, vars() still
	lists it, and a foreign store writes the position -- the class merely
	stopped assigning it (docs/Schema_Evolution_Design.md).  A revision-2
	instance never has x set; revision 3 assigns it again and the layout is
	simply unchanged."
	| mod c inst mod2 c2 mod3 c3 vars |
	mod := self loadRevision: 'class C:
    def __init__(self):
        self.x = 10
        self.y = 20
'.
	c := mod @env1:C.
	inst := c @env1:___pyCallValue___: { } kw: nil.
	self assert: (self layoutOf: c) equals: #(#x #y).
	self assert: (c whichClassIncludesSelector: #'___pyattr_x___' environmentId: 1) == c.
	mod2 := self loadRevision: 'class C:
    def __init__(self):
        self.y = 20
        self.z = 30
'.
	c2 := mod2 @env1:C.
	self assert: c2 == c.
	self assert: (self layoutOf: c2) equals: #(#x #y #z).
	self assert: (inst @env1:___pySlotIndexFor___: #x) equals: -1.
	self assert: (inst @env1:___pySlotIndexFor___: #y) equals: -2.
	self assert: (inst @env1:___pyAttrLoad___: #x) equals: 10
		description: 'the value the body stopped assigning is still there'.
	self assert: (inst @env1:___pyAttrLoad___: #y) equals: 20.
	self should: [inst @env1:___pyAttrLoad___: #z] raise: AttributeError.
	self assert: (c2 whichClassIncludesSelector: #'___pyattr_x___' environmentId: 1) == c2
		description: 'the pair survives with the name'.
	vars := inst @env1:___pyAttrLoad___: #'__dict__'.
	self assert: (vars @env1:__contains__: 'x').
	self assert: (vars @env1:__contains__: 'y').
	"A foreign store writes the position; nothing goes per object."
	inst @env1:___pyAttrStore___: #x put: 99.
	self assert: (inst at: 1) equals: 99.
	self assert: (inst dynamicInstVarAt: #x) isNil.
	"A revision-2 instance never assigns x: unbound, at its position."
	inst := c2 @env1:___pyCallValue___: { } kw: nil.
	self assert: inst _basicSize equals: 3.
	self assert: (inst at: 1) isNil.
	self should: [inst @env1:___pyAttrLoad___: #x] raise: AttributeError.
	mod3 := self loadRevision: 'class C:
    def __init__(self):
        self.x = 11
        self.y = 20
'.
	c3 := mod3 @env1:C.
	self assert: c3 == c.
	self assert: (self layoutOf: c3) equals: #(#x #y #z).
	inst := c3 @env1:___pyCallValue___: { } kw: nil.
	self assert: (inst at: 1) equals: 11.
	self should: [inst @env1:___pyAttrLoad___: #z] raise: AttributeError
%

category: 'Grail-Tests'
method: IndexedSlotRebuildTestCase
testParentStopsAssigningUnderSubclasses
	"A stops assigning a1 while B(A) merely inherited it and D(A) assigns it
	itself.  Nothing changes in any layout: a1 survives everywhere, A's pair
	keeps serving it, and every instance reads what it held.  Both subclasses
	are rebuilt in the same module load, so this is the merge path
	(___grailMergedSlotLayout___:), not the registry walk."
	| mod a b d bInst dInst mod2 a2 b2 d2 |
	mod := self loadRevision: 'class A:
    def __init__(self):
        self.a1 = 1
        self.a2 = 2

class B(A):
    def __init__(self):
        super().__init__()
        self.b1 = 7

class D(A):
    def __init__(self):
        super().__init__()
        self.a1 = 5
'.
	a := mod @env1:A. b := mod @env1:B. d := mod @env1:D.
	bInst := b @env1:___pyCallValue___: { } kw: nil.
	dInst := d @env1:___pyCallValue___: { } kw: nil.
	self assert: (self layoutOf: b) equals: #(#a1 #a2 #b1).
	self assert: (self layoutOf: d) equals: #(#a1 #a2).
	self assert: (d whichClassIncludesSelector: #'___pyattr_a1___' environmentId: 1) == a.
	mod2 := self loadRevision: 'class A:
    def __init__(self):
        self.a2 = 2

class B(A):
    def __init__(self):
        super().__init__()
        self.b1 = 7

class D(A):
    def __init__(self):
        super().__init__()
        self.a1 = 5
'.
	a2 := mod2 @env1:A. b2 := mod2 @env1:B. d2 := mod2 @env1:D.
	self assert: (a2 == a and: [b2 == b and: [d2 == d]]).
	self assert: (self layoutOf: a2) equals: #(#a1 #a2).
	self assert: (self layoutOf: b2) equals: #(#a1 #a2 #b1).
	self assert: (self layoutOf: d2) equals: #(#a1 #a2).
	self assert: (a2 whichClassIncludesSelector: #'___pyattr_a1___' environmentId: 1) == a2.
	self assert: (d2 whichClassIncludesSelector: #'___pyattr_a1___' environmentId: 1) == a2.
	self assert: (bInst @env1:___pyAttrLoad___: #a1) equals: 1.
	self assert: (bInst @env1:___pyAttrLoad___: #b1) equals: 7.
	self assert: (dInst @env1:___pyAttrLoad___: #a1) equals: 5.
	bInst := b2 @env1:___pyCallValue___: { } kw: nil.
	self should: [bInst @env1:___pyAttrLoad___: #a1] raise: AttributeError.
	dInst := d2 @env1:___pyCallValue___: { } kw: nil.
	self assert: (dInst @env1:___pyAttrLoad___: #a1) equals: 5.
	self assert: (dInst at: 1) equals: 5
%

category: 'Grail-Tests'
method: IndexedSlotRebuildTestCase
testPromotedNameHasOneHome
	"A value stored per object BEFORE the class gave the name a position (a
	promotion) has one home afterwards.  Until the first store it still reads;
	a store through the generic path moves it into the position and removes
	the per-object copy; a leftover under a store made through the class's own
	pair is invisible (the dict lists the name once, with the position's
	value); and del removes both, so nothing resurfaces
	(docs/Schema_Evolution_Design.md, cut 1; the dual_home scenario)."
	| mod c inst mod2 c2 vars |
	mod := self loadRevision: 'class C:
    def __init__(self):
        pass
'.
	c := mod @env1:C.
	inst := c @env1:___pyCallValue___: { } kw: nil.
	inst @env1:___pyAttrStore___: #x put: 1.
	self assert: (inst dynamicInstVarAt: #x) equals: 1 description: 'per object: the class has no position for x'.
	mod2 := self loadRevision: 'class C:
    def __init__(self):
        self.x = 0

    def set_x(self, v):
        self.x = v
'.
	c2 := mod2 @env1:C.
	self assert: c2 == c.
	self assert: (self layoutOf: c2) equals: #(#x).
	self assert: (inst @env1:___pyAttrLoad___: #x) equals: 1 description: 'the old per-object value still reads'.
	inst @env1:___pyAttrStore___: #x put: 2.
	self assert: (inst at: 1) equals: 2.
	self assert: (inst dynamicInstVarAt: #x) isNil description: 'the store moved the name into its position'.
	self assert: (inst @env1:___pyAttrLoad___: #x) equals: 2.
	vars := inst @env1:___pyAttrLoad___: #'__dict__'.
	self assert: (vars @env1:__getitem__: 'x') equals: 2.
	inst dynamicInstVarAt: #x put: 7.
	inst @env1:set_x: 3.
	vars := inst @env1:___pyAttrLoad___: #'__dict__'.
	self assert: (vars @env1:__getitem__: 'x') equals: 3.
	self assert: (vars @env1:__len__) equals: 1 description: 'the leftover is not a second entry'.
	self assert: (inst @env1:___pyAttrLoad___: #x) equals: 3.
	inst @env1:___pyAttrDelete___: #x.
	self assert: (inst dynamicInstVarAt: #x) isNil description: 'del removed both homes'.
	self should: [inst @env1:___pyAttrLoad___: #x] raise: AttributeError.
	self should: [inst @env1:___pyAttrDelete___: #x] raise: AttributeError
%

category: 'Grail-Tests'
method: IndexedSlotRebuildTestCase
testRemovedDeclaredSlotSurvivesButRefusesNewStore
	"__slots__ is a contract, not storage (docs/Schema_Evolution_Design.md
	par.2).  Revision 2 removes a from the declaration: a survives in the
	layout, the old instance still reads and can delete it, but a NEW store of
	a is refused like any undeclared name, on the old instance and on a new one."
	| mod s inst mod2 s2 |
	importlib ___inferredSlotsForce___: false.
	mod := self loadRevision: 'class S:
    __slots__ = (''a'', ''b'')
    def __init__(self):
        self.a = 1
        self.b = 2
'.
	s := mod @env1:S.
	inst := s @env1:___pyCallValue___: { } kw: nil.
	self assert: (self layoutOf: s) equals: #(#a #b).
	mod2 := self loadRevision: 'class S:
    __slots__ = (''b'',)
    def __init__(self):
        self.b = 2
'.
	s2 := mod2 @env1:S.
	self assert: s2 == s.
	self assert: (self layoutOf: s2) equals: #(#a #b) description: 'the removed slot survives'.
	self assert: (inst @env1:___pyAttrLoad___: #a) equals: 1.
	self should: [inst @env1:___pyAttrStore___: #a put: 5] raise: AttributeError.
	self assert: (inst @env1:___pyAttrLoad___: #a) equals: 1.
	inst @env1:___pyAttrStore___: #b put: 6.
	self assert: (inst @env1:___pyAttrLoad___: #b) equals: 6.
	inst @env1:___pyAttrDelete___: #a.
	self should: [inst @env1:___pyAttrLoad___: #a] raise: AttributeError.
	inst := s2 @env1:___pyCallValue___: { } kw: nil.
	self should: [inst @env1:___pyAttrStore___: #a put: 5] raise: AttributeError.
	self should: [inst @env1:___pyAttrStore___: #c put: 1] raise: AttributeError.
	self assert: (inst @env1:___pyAttrLoad___: #b) equals: 2
%

category: 'Grail-Tests'
method: IndexedSlotRebuildTestCase
testDropRefusesAnAssignedNameAndClearsAnUnassignedOne
	"The explicit drop (docs/Schema_Evolution_Design.md): refused while the
	body still assigns the name, and for a name the layout lacks; once the
	assignment is gone it nils every instance's value, turns the position
	into the hole ``~x'', removes the index entry and the pair, and the name
	is unknown to the class -- a foreign store is per object.  A later
	assignment of the SAME name revives the hole, and the per-object value
	reads until a store moves it.  Session-only entry point, as for
	compaction."
	| mod c inst mod2 c2 mod3 c3 report vars |
	mod := self loadRevision: 'class C:
    def __init__(self):
        self.x = 10
        self.y = 20
'.
	c := mod @env1:C.
	inst := c @env1:___pyCallValue___: { } kw: nil.
	self should: [c @env1:___grailDropSlotSessionOnly___: #x] raise: ImproperOperation.
	self should: [c @env1:___grailDropSlotSessionOnly___: #nope] raise: ImproperOperation.
	self assert: (self layoutOf: c) equals: #(#x #y).
	self assert: (inst at: 1) equals: 10.
	mod2 := self loadRevision: 'class C:
    def __init__(self):
        self.y = 20
'.
	c2 := mod2 @env1:C.
	report := c2 @env1:___grailDropSlotSessionOnly___: #x.
	self assert: report asArray equals: #(1 1).
	self assert: (self layoutOf: c2) equals: #(#'~x' #y).
	self assert: (inst at: 1) isNil.
	self should: [inst @env1:___pyAttrLoad___: #x] raise: AttributeError.
	self assert: (inst @env1:___pySlotIndexFor___: #x) equals: 0.
	self assert: (c2 whichClassIncludesSelector: #'___pyattr_x___' environmentId: 1) isNil.
	vars := inst @env1:___pyAttrLoad___: #'__dict__'.
	self deny: (vars @env1:__contains__: 'x').
	inst @env1:___pyAttrStore___: #x put: 99.
	self assert: (inst dynamicInstVarAt: #x) equals: 99.
	self assert: (inst at: 1) isNil.
	mod3 := self loadRevision: 'class C:
    def __init__(self):
        self.x = 11
        self.y = 20
'.
	c3 := mod3 @env1:C.
	self assert: (self layoutOf: c3) equals: #(#x #y) description: 'the same name revives its hole'.
	self assert: (inst @env1:___pyAttrLoad___: #x) equals: 99.
	inst := c3 @env1:___pyCallValue___: { } kw: nil.
	self assert: (inst at: 1) equals: 11
%
