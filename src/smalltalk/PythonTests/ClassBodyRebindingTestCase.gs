! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyRebindingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyRebindingTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyRebindingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyRebindingTestCase
!
! A class body that binds the same name twice.  Two defects, one root.
!
! ClassDefAst materializes each class attribute as a classInstVar plus an
! accessor pair, and built the DECLARATION list with one entry per assignment
! TARGET.  A body that rebinds a name therefore declared the slot twice and
! GemStone refused it (rtErrAddDupInstvar); Class.gs's retry reported the
! catch-all ``Grail cannot subclass sealed kernel class 'PythonInstance''', so
! the class failed to build at all -- for ordinary Python:
!
!     class C:
!         x = 1
!         x = x + 1
!
! Separately, CPython's _EnumDict.__setitem__ makes rebinding an ENUM class
! body's name a TypeError, however the two bindings are spelled:
! assignment/assignment, assignment/def, or descriptor/assignment
! (test_duplicate_name_error).  Grail's stores simply overwrite, so by the time
! the metaclass hook runs one value is left and nothing records there were two.
! Codegen now emits ___classBodyDuplicates___ alongside ___classBodyOrder___,
! and only Enum's ___grailBuildMembers: acts on it -- rebinding stays legal
! everywhere else, which is why CPython puts the rule in _EnumDict and not in
! type.__new__.
!
! The two interact: until the declaration bug was fixed the assignment/
! assignment case died in class creation and never reached the enum check.
!
! Drives tests/python/class_body_rebinding.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyRebindingTestCase removeAllMethods.
ClassBodyRebindingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassBodyRebindingTestCase
setUp
	"Reload tests/python/class_body_rebinding.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_rebinding' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_body_rebinding.py')
		name: 'class_body_rebinding'.
%

category: 'Grail-Private'
method: ClassBodyRebindingTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - Ordinary rebinding'
method: ClassBodyRebindingTestCase
testPlainClassMayRebindAName
	"``x = 1'' then ``x = x + 1'' is ordinary Python.  The duplicate slot
	declaration made the whole class fail to build."

	self assert: (self resultAt: 'plain_x') equals: 2.
	self assert: (self resultAt: 'plain_y') asString equals: 'ab'.
	self assert: (self resultAt: 'rebound') asString equals: '[1, 2, 3]/3'.
%

category: 'Grail-Tests - Ordinary rebinding'
method: ClassBodyRebindingTestCase
testRebindingSubclassKeepsItsOwnValue
	"Deduplicating the DECLARATION must not collapse the per-class storage
	Python's ``A.attr != B.attr'' depends on -- the stores stay one per
	assignment, in source order."

	self assert: (self resultAt: 'per_class') asString equals: 'base/SUB'.
%

category: 'Grail-Tests - Enum duplicate names'
method: ClassBodyRebindingTestCase
testEnumRejectsEverySpellingOfADuplicate
	"CPython _EnumDict.__setitem__ (test_duplicate_name_error).  The reported
	value is the SURVIVING binding's, where CPython names the first one's: the
	earlier store is already gone when the metaclass hook runs."

	self assert: (self resultAt: 'dup_assign_assign') asString
		equals: '''red'' already defined as 4'.
	self assert: (self resultAt: 'dup_assign_def') asString
		equals: '''red'' already defined as 1'.
	self assert: (self resultAt: 'dup_property_assign') asString
		equals: '''red'' already defined as 1'.
%

category: 'Grail-Tests - Enum duplicate names'
method: ClassBodyRebindingTestCase
testOrdinaryEnumUnaffected
	"No duplicates, no error."

	self assert: (self resultAt: 'ordinary') asString equals: 'a=1,b=2,c=3'.
%

category: 'Grail-Tests - Enum duplicate names'
method: ClassBodyRebindingTestCase
testAliasIsNotADuplicate
	"Two NAMES sharing one value is an alias, not a rebinding -- the check keys
	on the bound name, so ``dupe = 1'' after ``a = 1'' stays legal."

	self assert: (self resultAt: 'alias') asString equals: 'a,b/a'.
%
