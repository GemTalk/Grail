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
! Python __slots__ → GemStone named instance variables on the backing
! class.  A slotted class stores its declared attributes in fixed named
! instVars (read/written via the compile-time direct path and the runtime
! instVarNamed: probe), forbids non-slot attributes, and has no __dict__.
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
testBackingClassHasNamedInstVars
	"The Python __slots__ became real GemStone named instance variables
	on the backing class.  The instVar names are mangled (``x'' →
	``___slot_x___'') so they can't collide with Python method locals."

	| cls names |
	cls := testModule @env1:___pyAttrLoad___: #Point.
	names := cls allInstVarNames.
	self assert: (names includes: #'___slot_x___').
	self assert: (names includes: #'___slot_y___').
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
	"___subclass___: filters names the parent declares, so the inherited
	base slot is reused (single slot), not duplicated in the subclass."

	| cls names |
	cls := testModule @env1:___pyAttrLoad___: #Derived.
	names := cls allInstVarNames.
	self assert: (names includes: #'___slot_base_v___').
	self assert: (names includes: #'___slot_deriv_v___').
	self assert: (names occurrencesOf: #'___slot_base_v___') equals: 1.
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
	"self.slot += 1 loads and stores the named instVar."

	self assert: (testModule @env1:___pyAttrLoad___: #counter_after_bumps) equals: 2.
%
