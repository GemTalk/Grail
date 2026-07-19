! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FunctionRebindingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FunctionRebindingTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FunctionRebindingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FunctionRebindingTestCase
!
! Module-level rebinding of a name that was originally a top-level def
! must reach the rebound value.  Pre-fix, CallAst's bare-call self-send
! shortcut emitted `self foo: x` based on parser-time knowledge (`def
! foo`) and bypassed the dynamic-instVar write that rebound the name.
! Same family as Python's data model: ``mod.foo'' after ``foo = 21''
! should yield 21, and ``mod.foo(5)'' should TypeError on the int.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FunctionRebindingTestCase removeAllMethods.
FunctionRebindingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: FunctionRebindingTestCase
setUp
	"Load tests/python/function_rebinding.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'function_rebinding' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/function_rebinding.py')
		name: 'function_rebinding'.
%

category: 'Grail-Tests - Rebind to non-callable'
method: FunctionRebindingTestCase
testOriginalDefStillCallableBeforeRebind
	"Sanity: before the rebinding, the def works normally."

	self assert: (testModule @env1:___pyAttrLoad___: #doubler_before) equals: 10.
%

category: 'Grail-Tests - Rebind to non-callable'
method: FunctionRebindingTestCase
testRebindToIntChangesAttributeValue
	"After ``doubler = 21'', reading the attribute returns the int."

	self assert: (testModule @env1:___pyAttrLoad___: #doubler_value_after) equals: 21.
%

category: 'Grail-Tests - Rebind to non-callable'
method: FunctionRebindingTestCase
testRebindToIntMakesCallTypeError
	"After ``doubler = 21'', calling ``doubler(5)'' should TypeError —
	int is not callable.  Pre-fix, CallAst's bare-call self-send
	shortcut bypassed the rebinding and called the original def
	(returning 10).  Red light: rebind_typeerror is False today
	because rebind_call_result successfully = 10."

	self assert: (testModule @env1:___pyAttrLoad___: #rebind_typeerror) equals: true.
%

category: 'Grail-Tests - Rebind to callable alias'
method: FunctionRebindingTestCase
testRebindToOtherFunctionCallsAlias
	"After ``tripler = quintupler'', calling ``tripler(4)'' should
	dispatch to ``quintupler'' (returns 20), not the original
	tripler (which would return 12)."

	self assert: (testModule @env1:___pyAttrLoad___: #tripler_before) equals: 12.
	self assert: (testModule @env1:___pyAttrLoad___: #tripler_after) equals: 20.
%

category: 'Grail-Tests - First-class function'
method: FunctionRebindingTestCase
testFunctionAsValueRoundTrips
	"Reading a def by name (without calling) yields a callable
	BoundMethod that can be invoked later.  ``f = cuber; f(3)'' →
	27."

	self assert: (testModule @env1:___pyAttrLoad___: #f_call_result) equals: 27.
	self assert: (testModule @env1:___pyAttrLoad___: #cuber_call_result) equals: 27.
%

category: 'Grail-Tests - Rebind to non-function value'
method: FunctionRebindingTestCase
testRebindToStringYieldsStringValue
	"After ``stomper = 'stomped''', reading ``stomper'' yields the
	string and isinstance(stomper, str) is True."

	self assert: (testModule @env1:___pyAttrLoad___: #stomper_value) equals: 'stomped'.
	self assert: (testModule @env1:___pyAttrLoad___: #stomper_is_str) equals: true.
%
