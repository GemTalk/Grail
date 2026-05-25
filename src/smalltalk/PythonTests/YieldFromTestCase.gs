! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for YieldFromTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'YieldFromTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
YieldFromTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! YieldFromTestCase
!
! ``yield from <iter>'' delegates iteration to the inner iterable.
! Grail's YieldFromAst emits ``<iter> @env0:do: [:each | ___gen___
! ___yield___: each]'', so the receiver needs a ``do:'' method.
! Smalltalk collections have one; PythonGenerator did NOT, so
! ``yield from <generator>'' MNU'd on the first yielded value.
!
! Was the second bug surfaced once the duplicate-class fix
! (commit a9e96e5) let Node.iter_child_nodes actually return
! children — jinja2's Node.find_all uses ``yield from
! child.find_all(node_type)'' for tree traversal.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
YieldFromTestCase removeAllMethods.
YieldFromTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: YieldFromTestCase
setUp
	"Reload tests/python/yield_from.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'yield_from' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/yield_from.py')
		name: 'yield_from'.
%

category: 'Grail-Tests - yield from generator'
method: YieldFromTestCase
testYieldFromGeneratorForwardsItems
	"``yield from _producer()'' forwards each of producer's yielded
	items to the outer generator, then continues with the outer body."

	| result |
	result := testModule @env1:yield_from_generator.
	self assert: result @env0:size equals: 4.
	self assert: (result @env0:at: 1) equals: 1.
	self assert: (result @env0:at: 2) equals: 2.
	self assert: (result @env0:at: 3) equals: 3.
	self assert: (result @env0:at: 4) equals: 99
%

category: 'Grail-Tests - yield from sequence'
method: YieldFromTestCase
testYieldFromListForwardsItems
	"``yield from [10, 20, 30]'' forwards a regular sequence."

	| result |
	result := testModule @env1:yield_from_list.
	self assert: result @env0:size equals: 3.
	self assert: (result @env0:at: 1) equals: 10.
	self assert: (result @env0:at: 2) equals: 20.
	self assert: (result @env0:at: 3) equals: 30
%

category: 'Grail-Tests - empty inner'
method: YieldFromTestCase
testYieldFromEmptyGenerator
	"``yield from <empty generator>'' yields nothing, then the outer
	body continues normally."

	| result |
	result := testModule @env1:yield_from_empty_generator.
	self assert: result @env0:size equals: 1.
	self assert: (result @env0:at: 1) equals: 'done'
%

category: 'Grail-Tests - nested chain'
method: YieldFromTestCase
testYieldFromNestedChain
	"Three-level ``yield from'' chain: outer → middle → inner.
	Order preserved across all three frames."

	| result |
	result := testModule @env1:yield_from_nested.
	self assert: result @env0:size equals: 4.
	self assert: (result @env0:at: 1) equals: 'a'.
	self assert: (result @env0:at: 2) equals: 'b'.
	self assert: (result @env0:at: 3) equals: 'c'.
	self assert: (result @env0:at: 4) equals: 'd'
%
