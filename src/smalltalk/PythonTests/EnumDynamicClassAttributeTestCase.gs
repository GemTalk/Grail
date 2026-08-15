! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumDynamicClassAttributeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumDynamicClassAttributeTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumDynamicClassAttributeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumDynamicClassAttributeTestCase
!
! ``enum.property'' / ``types.DynamicClassAttribute'' -- a property that is
! deliberately INVISIBLE ON THE CLASS.  It exists so an enum member can have a
! ``name'' while the enum CLASS keeps its own meaning for that name, and CPython
! spells the difference in __get__:
!
!     C.A.foo    'foo-A'          -- instance access runs the getter
!     C.foo      AttributeError   -- class access is refused
!
! An ordinary property answers the DESCRIPTOR ITSELF for class access, which is
! what makes ``C.prop.fget'' work, and PropertyDescriptor is right to do that.
! Grail exported enum.property AS PropertyDescriptor, so the two were one object
! with one behaviour and the enum case took the property answer.  A subclass
! overriding __get__:_: is the whole difference.
!
! COVERS THE CALL FORM ONLY.  ``@enum.property def foo'' still compiles to a
! plain getter method and builds no descriptor -- unchanged, not regressed, and
! a ClassDefAst change to close.
!
! Prerequisite for test_enum's test_inspect_getmembers and
! test_inspect_classify_class_attrs, which find Enum.name/.value only by
! sweeping for isinstance(v, DynamicClassAttribute) -- a test that could not be
! written while one class served both spellings.  Enum.name/.value are still
! plain Smalltalk methods, so those two remain open.
!
! The fixture is self-running (docs/Testing_Guide.md): all six checks answer
! True under CPython 3.14 too, so the agreement is machine-checked.
!
! Drives tests/python/enum_dynamic_class_attribute.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumDynamicClassAttributeTestCase removeAllMethods.
EnumDynamicClassAttributeTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumDynamicClassAttributeTestCase
setUp
	"Reload tests/python/enum_dynamic_class_attribute.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_dynamic_class_attribute' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_dynamic_class_attribute.py')
		name: 'enum_dynamic_class_attribute'.
%

category: 'Grail-Private'
method: EnumDynamicClassAttributeTestCase
check: aName
	"Every fixture check is a zero-argument function answering True."

	^ (testModule @env1:___pyAttrLoad___: aName) @env1:value: #() value: nil
%

category: 'Grail-Tests - The descriptor'
method: EnumDynamicClassAttributeTestCase
testInstanceAccessRunsTheGetter
	self assert: (self check: #'instance_access_runs_the_getter') equals: true.
%

category: 'Grail-Tests - The descriptor'
method: EnumDynamicClassAttributeTestCase
testClassAccessIsRefused
	"The entire point of the descriptor, and the one place it parts company
	with its superclass."

	self assert: (self check: #'class_access_is_refused') equals: true.
%

category: 'Grail-Tests - The descriptor'
method: EnumDynamicClassAttributeTestCase
testItWorksOnAPlainClassToo
	"Nothing about it is enum-specific; enum is just its motivating user."

	self assert: (self check: #'it_works_on_a_plain_class_too') equals: true.
%

category: 'Grail-Tests - The descriptor'
method: EnumDynamicClassAttributeTestCase
testTheTwoAreDifferentClasses
	"Which is what lets inspect sweep for one and not the other."

	self assert: (self check: #'the_two_are_different_classes') equals: true.
%

category: 'Grail-Tests - Unchanged behaviour'
method: EnumDynamicClassAttributeTestCase
testAnOrdinaryPropertyStillAnswersItself
	"Guard rail.  The builtin property must keep CPython's class-access
	behaviour -- answering the descriptor is what makes C.prop.fget work."

	self assert: (self check: #'an_ordinary_property_still_answers_itself') equals: true.
%

category: 'Grail-Tests - Module identity'
method: EnumDynamicClassAttributeTestCase
testItReportsTheNameItIsExportedUnder
	"__module__ / __qualname__ are how a class is pickled BY REFERENCE.  Without
	them pickle SCANS sys.modules for a module exposing the object under its
	__qualname__, so the answer depends on what an earlier import brought in --
	which is exactly what made EnumPickleByNameTestCase order-dependent when
	this class was introduced."

	self assert: (self check: #'it_reports_the_name_it_is_exported_under') equals: true.
%
