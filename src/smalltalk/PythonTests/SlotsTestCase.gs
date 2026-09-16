! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SlotsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SlotsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SlotsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SlotsTestCase
!
! Python __slots__.  A declared slot is a POSITION in the instance's indexed
! part, laid out per class in ___pySlotLayout___ and reached through the
! accessor pair ``self ___pyattr_x___'' / ``self ___pyattr_x___: v''
! (docs/Instance_Attribute_Indexed_Slots.md) -- the class declares no named
! instVar, so an edit that adds a slot keeps the class identity and every
! instance.  A slotted class forbids non-slot attributes and has no __dict__.
! The one exception is a KERNEL-rooted class (Exception, dict, ...), whose
! indexed part is its content: there a declared slot is still a named instVar
! ``___slot_x___''.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SlotsTestCase removeAllMethods.
SlotsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SlotsTestCase
setUp
	"Reload tests/python/slots.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'slots' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/slots.py')
		name: 'slots'.
%

category: 'Grail-Tests - Read/Write'
method: SlotsTestCase
testSlotReadWrite
	"Slots set in __init__ read back; a method reads them; a slot updates."

	self assert: (testModule @env1:___pyAttrLoad___: #p_x) equals: 3.
	self assert: (testModule @env1:___pyAttrLoad___: #p_y) equals: 4.
	self assert: (testModule @env1:___pyAttrLoad___: #p_total) equals: 7.
	self assert: (testModule @env1:___pyAttrLoad___: #p_x_after) equals: 10.
%

category: 'Grail-Tests - Mapping'
method: SlotsTestCase
testDeclaredSlotsArePositionsNotInstVars
	"Point declares x and y: the backing class has NO named instVar for them,
	its layout lists them in declaration order, the slot index table answers
	their positions negated, a built instance holds both in its indexed part,
	and the class owns the accessor pair a method body sends."

	| cls inst |
	cls := testModule @env1:___pyAttrLoad___: #Point.
	self assert: cls instVarNames isEmpty.
	self deny: (cls allInstVarNames includes: #'___slot_x___').
	self assert: (cls perform: #'___pySlotLayout___' env: 1) asArray equals: #(#x #y).
	inst := cls @env1:___pyCallValue___: { 3. 4 } kw: nil.
	self assert: (inst @env1:___pySlotIndexFor___: #x) equals: -1.
	self assert: (inst @env1:___pySlotIndexFor___: #y) equals: -2.
	self assert: inst _basicSize equals: 2.
	self assert: (inst at: 1) equals: 3.
	self assert: (inst at: 2) equals: 4.
	self assert: inst dynamicInstanceVariables isEmpty.
	self assert: (cls whichClassIncludesSelector: #'___pyattr_x___' environmentId: 1) == cls.
	self assert: (cls whichClassIncludesSelector: #'___pyattr_x___:' environmentId: 1) == cls.
	"Declared, so strict -- and not an instance-dict entry."
	self assert: (cls whichClassIncludesSelector: #'___pySlotsStrict___' environmentId: 1) == cls.
	self assert: (cls @env1:___pyInferredSlotNames___) isEmpty.
%

category: 'Grail-Tests - Mapping'
method: SlotsTestCase
testKernelRootedSlotKeepsANamedInstVar
	"SlottedError(Exception) declares tag.  An Exception uses its indexed part
	for its own content, so there the declared slot is still a named instVar
	(mangled ``___slot_tag___''), the index table answers a POSITIVE index,
	and the accessor pair reads and writes that instVar.  The Python
	behaviour is the same either way."

	| cls |
	cls := testModule @env1:___pyAttrLoad___: #SlottedError.
	self assert: (cls allInstVarNames includes: #'___slot_tag___').
	self assert: ((cls @env1:___pyCallValue___: { 1 } kw: nil) @env1:___pySlotIndexFor___: #tag) > 0.
	self assert: (cls whichClassIncludesSelector: #'___pyattr_tag___' environmentId: 1) == cls.
	self assert: (testModule @env1:___pyAttrLoad___: #err_tag) equals: 7.
	self assert: (testModule @env1:___pyAttrLoad___: #err_doubled) equals: 14.
	self assert: (testModule @env1:___pyAttrLoad___: #err_tag_after) equals: 9.
%

category: 'Grail-Tests - Strict'
method: SlotsTestCase
testUnsetSlotRaises
	"Reading a declared-but-unset slot raises AttributeError."

	self assert: (testModule @env1:___pyAttrLoad___: #unset_slot_raises) equals: true.
%

category: 'Grail-Tests - Strict'
method: SlotsTestCase
testNonSlotAssignRaises
	"Assigning an attribute not in __slots__ raises AttributeError."

	self assert: (testModule @env1:___pyAttrLoad___: #nonslot_assign_raises) equals: true.
%

category: 'Grail-Tests - Strict'
method: SlotsTestCase
testNoDict
	"A slotted instance has no __dict__ (AttributeError on access)."

	self assert: (testModule @env1:___pyAttrLoad___: #dict_access_raises) equals: true.
%

category: 'Grail-Tests - Class attr'
method: SlotsTestCase
testSlotsClassAttr
	"cls.__slots__ remains a readable class attribute (the declared tuple)."

	self assert: (testModule @env1:___pyAttrLoad___: #slots_is_tuple) equals: true.
	self assert: (testModule @env1:___pyAttrLoad___: #slots_len) equals: 2.
%

category: 'Grail-Tests - Forms'
method: SlotsTestCase
testSingleStringSlot
	"__slots__ = 'only' (a bare string) declares a single slot."

	self assert: (testModule @env1:___pyAttrLoad___: #single_val) equals: 42.
%

category: 'Grail-Tests - Forms'
method: SlotsTestCase
testEmptySlots
	"__slots__ = () declares no slots and still forbids attributes."

	self assert: (testModule @env1:___pyAttrLoad___: #empty_assign_raises) equals: true.
%

category: 'Grail-Tests - Inheritance'
method: SlotsTestCase
testInheritanceReadsBaseSlot
	"A subclass method reads a slot declared by its base (inherited slot,
	resolved by the runtime instVarNamed: probe); its own slot works too."

	self assert: (testModule @env1:___pyAttrLoad___: #derived_reads_base) equals: 99.
	self assert: (testModule @env1:___pyAttrLoad___: #derived_own_slot) equals: 7.
%

category: 'Grail-Tests - Inheritance'
method: SlotsTestCase
testBaseSlotNotDuplicated
	"Derived's layout CONTINUES Base's: base_v keeps Base's position and
	Base's accessor pair serves it, deriv_v is appended with a pair of
	Derived's own.  No named instVar on either class."

	| base derived |
	base := testModule @env1:___pyAttrLoad___: #Base.
	derived := testModule @env1:___pyAttrLoad___: #Derived.
	self assert: base instVarNames isEmpty.
	self assert: derived instVarNames isEmpty.
	self assert: (base perform: #'___pySlotLayout___' env: 1) asArray equals: #(#base_v).
	self assert: (derived perform: #'___pySlotLayout___' env: 1) asArray equals: #(#base_v #deriv_v).
	self assert: (derived whichClassIncludesSelector: #'___pyattr_base_v___' environmentId: 1) == base.
	self assert: (derived whichClassIncludesSelector: #'___pyattr_deriv_v___' environmentId: 1) == derived.
%

category: 'Grail-Tests - Delete'
method: SlotsTestCase
testDelSlot
	"del obj.slot resets the slot; a later read raises AttributeError."

	self assert: (testModule @env1:___pyAttrLoad___: #del_then_read_raises) equals: true.
%

category: 'Grail-Tests - AugAssign'
method: SlotsTestCase
testAugAssignSlot
	"self.slot += 1 loads and stores the slot through the accessor pair."

	self assert: (testModule @env1:___pyAttrLoad___: #counter_after_bumps) equals: 2.
%
