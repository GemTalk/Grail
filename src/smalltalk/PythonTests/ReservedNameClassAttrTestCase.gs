! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ReservedNameClassAttrTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ReservedNameClassAttrTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ReservedNameClassAttrTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ReservedNameClassAttrTestCase
!
! A Python class attribute named after a Smalltalk PSEUDO-VARIABLE -- ``self'',
! ``super'', ``nil'', ``true'', ``false'', ``thisContext''.
!
! ClassDefAst backs each class attribute with a classInstVar of the same name
! and emits a getter/setter pair over it.  A pseudo-variable can be neither
! declared nor assigned, so BOTH the ``classInstVarNames:'' declaration and the
! ``true := ___1'' setter body were uncompilable; the pair failed to compile and
! the whole class became a raising stub (``NameError: Grail could not compile
! this method (codegen gap)'').  Parameters and locals already got a mangled
! transport name from NameAst's reserved-name rename -- class attributes were
! the gap, and they now share that same predicate via
! ClassDefAst>>___classAttrBackingSlotFor:reserved:.
!
! Drives tests/python/reserved_name_class_attrs.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ReservedNameClassAttrTestCase removeAllMethods.
ReservedNameClassAttrTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ReservedNameClassAttrTestCase
setUp
	"Reload tests/python/reserved_name_class_attrs.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'reserved_name_class_attrs' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/reserved_name_class_attrs.py')
		name: 'reserved_name_class_attrs'.
%

category: 'Grail-Private'
method: ReservedNameClassAttrTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - Reserved-name class attributes'
method: ReservedNameClassAttrTestCase
testReadsEveryPseudoVariableName
	"All six pseudo-variable names, plus an ordinary one, read back their
	class-body values.  The class used to fail to compile outright."

	self assert: (self resultAt: 'read') asString equals: '1,2,3,4,5,6,7'.
%

category: 'Grail-Tests - Reserved-name class attributes'
method: ReservedNameClassAttrTestCase
testStoreThroughMangledSlot
	"``Plain.true = 100'' dispatches to the accessor pair and lands in the
	mangled backing slot."

	self assert: (self resultAt: 'after_store') equals: 100.
%

category: 'Grail-Tests - Reserved-name class attributes'
method: ReservedNameClassAttrTestCase
testPerClassStorageStillIsolated
	"Smalltalk class-side instVars are per-class storage, which is what gives
	Python's ``A.attr != B.attr''.  Mangling the slot must not merge them."

	self assert: (self resultAt: 'sub_override') equals: 42.
	self assert: (self resultAt: 'parent_intact') equals: 100.
%

category: 'Grail-Tests - Reserved-name class attributes'
method: ReservedNameClassAttrTestCase
testRealClassNameUntouched
	"The mangling exists so a Python attribute cannot overwrite the class's
	structural slots; the class's own name still reads correctly."

	self assert: (self resultAt: 'class_name') asString equals: 'Plain'.
%

category: 'Grail-Tests - Reserved-name class attributes'
method: ReservedNameClassAttrTestCase
testEnumMembersMayUsePseudoVariableNames
	"``class Logic(Enum): true = True; false = False'' -- test_enum
	TestSpecial.test_bool, which reported the codegen gap for the whole class."

	self assert: (self resultAt: 'enum_members') asString equals: 'true,false'.
	self assert: (self resultAt: 'enum_true_value') equals: true.
	self assert: (self resultAt: 'enum_truthy').
	self assert: (self resultAt: 'enum_names') asString
		equals: 'nil,self,super,thisContext'.
%
