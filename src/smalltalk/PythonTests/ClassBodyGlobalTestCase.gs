! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyGlobalTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyGlobalTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyGlobalTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyGlobalTestCase
!
! A CLASS BODY IS A SCOPE, so it can declare ``global x'':
!
!     x = 12
!     class Global:
!         global x
!         x = 13          # the MODULE's x becomes 13; Global has no ''x''
!
! Grail read the declaration for neither half -- it bound a class attribute and
! left the module binding at 12, wrong in both directions.  Exactly the shape
! the ``nonlocal'' case had (ClassBodyNonlocalTestCase), one scope further out,
! and the routing half is fixed the same way: the name is excluded from
! classBodyAttributes, and the write is emitted through the statement's own
! printSmalltalkOn:, where AssignAst picks the module receiver (or, inside a
! doit, the scope handle).
!
! WHAT MAKES IT MORE THAN A ROUTING CHANGE IS THE ORDER.  A class body runs top
! to bottom, so an attribute BEFORE the write sees the old value and one AFTER
! it sees the new:
!
!     class C:
!         global g
!         x = g       # 1
!         g = 2
!         y = g       # 2
!
! The obvious emit -- a pass after the class attributes, which is what the
! ``nonlocal'' writes use -- answers y == 1, because every attribute value has
! already been computed by the time the write runs.  I shipped this change
! without that ordering once and withdrew it: it turned test_listcomps'
! test_explicit_global from passing to failing on exactly this shape.  The
! writes are now flushed into the attribute emit at their own source positions.
!
! A METHOD is its own scope, so the declaration does not reach it: ``def set(
! self, val): x = val'' stays an ordinary method local.  A test pins that,
! since routing every method assignment at the module would pass the headline
! case and be badly wrong.
!
! Every expectation below was checked against CPython 3.14 by running
! tests/python/class_body_global.py under it directly.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyGlobalTestCase removeAllMethods.
ClassBodyGlobalTestCase class removeAllMethods.
%

category: 'Grail-Setup'
method: ClassBodyGlobalTestCase
setUp
	"Reload tests/python/class_body_global.py fresh each test -- its
	module-level globals are what the class bodies rebind."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_global' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/class_body_global.py')
		name: 'class_body_global'.
%

category: 'Grail-Tests'
method: ClassBodyGlobalTestCase
testModuleLevelClassBodyGlobal
	"THE BUG.  The module binding becomes 13, a method reading the name sees
	13, and the class has NO attribute of that name -- Grail answered 12, 12,
	true."

	self assert: testModule @env1:module_level_class_body_global asArray
		equals: #( 13 13 false ).
%

category: 'Grail-Tests'
method: ClassBodyGlobalTestCase
testAttributesAroundTheWriteSeeSourceOrder
	"THE ORDERING CASE, and the reason the write cannot be a pass after the
	class attributes: ``x'' is read before it and ``y'' after it.  Emitting the
	write last answers ( 1 1 2 false ) -- which is how this change regressed
	test_listcomps the first time it was written."

	self assert: testModule @env1:attributes_around_the_write_see_source_order asArray
		equals: #( 1 2 2 false ).
%

category: 'Grail-Tests'
method: ClassBodyGlobalTestCase
testAMethodAssigningTheNameIsStillLocal
	"A method is its own scope, so the class body's declaration does not reach
	it: ``gy = val'' there binds a method local and leaves the module's gy
	alone.  Routing every method assignment at the module would pass the first
	test and fail this one."

	self assert: testModule @env1:a_method_assigning_the_name_is_still_local asArray
		equals: #( 999 101 101 ).
%

category: 'Grail-Tests'
method: ClassBodyGlobalTestCase
testAnUndeclaredClassAttributeIsUnaffected
	"Only the DECLARED name is exempt from becoming a class attribute; a
	sibling assignment in the same body is an ordinary one."

	self assert: testModule @env1:an_undeclared_class_attribute_is_unaffected asArray
		equals: #( 21 22 false ).
%

category: 'Grail-Tests'
method: ClassBodyGlobalTestCase
testExecClassBodyGlobal
	"Inside exec the write goes through the doit's scope handle rather than a
	module instance, so the whole shape needs its own test."

	self assert: testModule @env1:exec_class_body_global asArray
		equals: #( 13 13 false ).
%

category: 'Grail-Tests'
method: ClassBodyGlobalTestCase
testExecClassBodyGlobalOrdering
	"...and so does the ordering, for the same reason."

	self assert: testModule @env1:exec_class_body_global_ordering asArray
		equals: #( 1 2 2 ).
%
