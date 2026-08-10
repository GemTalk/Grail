! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassNewAttributeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassNewAttributeTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassNewAttributeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassNewAttributeTestCase
!
! ``Cls.__new__'' answers the allocator FUNCTION rather than running it.
!
! object>>___pyAttrLoad___ treats a unary getter plus a same-named 1-arg method
! on the metaclass as a synthesised class-attribute accessor PAIR, and performs
! the getter.  ``object class'' defines the allocator in BOTH arities -- unary
! ``__new__'' and 1-arg ``__new__: cls'' -- so the heuristic read every
! ``Cls.__new__'' on a PythonInstance-rooted class as a value attribute and
! ALLOCATED: ``Enum.__new__'' answered ``<Enum.nil: nil>'', and
! ``P.__new__(P)'' -- the allocate-without-__init__ idiom that copy / pickle /
! __reduce__ rely on -- died with a Smalltalk doesNotUnderstand.
!
! Also covers CPython's EnumType rule that an enum class's __new__ IS
! Enum.__new__ (whatever built the members is kept as _new_member_).
!
! Drives tests/python/class_new_attribute.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassNewAttributeTestCase removeAllMethods.
ClassNewAttributeTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassNewAttributeTestCase
setUp
	"Reload tests/python/class_new_attribute.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_new_attribute' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_new_attribute.py')
		name: 'class_new_attribute'.
%

category: 'Grail-Private'
method: ClassNewAttributeTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - Cls.__new__'
method: ClassNewAttributeTestCase
testReadingClassNewDoesNotConstruct
	"``P.__new__'' is the function.  It used to be a fresh ``<P object>''."

	self assert: (self resultAt: 'plain_new_type').
%

category: 'Grail-Tests - Cls.__new__'
method: ClassNewAttributeTestCase
testAllocateWithoutInit
	"``P.__new__(P)'' allocates and does NOT run __init__ -- what copy, pickle
	and hand-written __reduce__ implementations do.  This used to raise a raw
	Smalltalk MessageNotUnderstood."

	self assert: (self resultAt: 'alloc_type') asString equals: 'P'.
	self assert: (self resultAt: 'alloc_skipped_init').
%

category: 'Grail-Tests - Cls.__new__'
method: ClassNewAttributeTestCase
testUserDefinedNewStillRuns
	"A class-body ``def __new__'' is still the one that runs when called
	explicitly -- the fix only stopped the READ from allocating."

	self assert: (self resultAt: 'user_new_ran').
%

category: 'Grail-Tests - Enum.__new__ identity'
method: ClassNewAttributeTestCase
testEnumClassNewIsEnumNew
	"CPython EnumType.__new__ replaces the class's __new__ with Enum.__new__,
	so the identity holds for a plain enum AND for a data-mixed one whose
	mix-in defines its own __new__ (test_enum's test_subclasses_with_* read
	exactly this)."

	self assert: (self resultAt: 'plain_enum_new_is_enum_new').
	self assert: (self resultAt: 'mixed_enum_new_is_enum_new').
%
