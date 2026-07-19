! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassFunctionBindingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassFunctionBindingTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassFunctionBindingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassFunctionBindingTestCase
!
! Python's descriptor protocol for functions stored as class attributes.
! When ``Cls.method = func'' assigns a callable to a class slot, reading
! the attribute through an INSTANCE returns a bound method that
! prepends the instance to the call's arguments.  Reading through the
! CLASS returns the function unchanged.  Storing on the INSTANCE
! bypasses the descriptor protocol.
!
! This is the gap that blocks @dataclass from synthesizing __init__
! and ``cls.__init__ = generated_init''.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassFunctionBindingTestCase removeAllMethods.
ClassFunctionBindingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassFunctionBindingTestCase
setUp
	"Load tests/python/class_function_binding.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_function_binding' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_function_binding.py')
		name: 'class_function_binding'.
%

category: 'Grail-Tests'
method: ClassFunctionBindingTestCase
testCallGreetViaInstance
	"Box.greet = greet ; Box(7).greet('hi') → (7, 'hi').
	The class-side assignment must bind the receiver at lookup time."

	| result |
	result := testModule @env1:___pyAttrLoad___: #greet_via_instance.
	self assert: (result at: 1) equals: 7.
	self assert: (result at: 2) equals: 'hi'.
%

category: 'Grail-Tests'
method: ClassFunctionBindingTestCase
testCallGreetViaClass
	"Box.greet(b, 'hey') passes the explicit instance — no binding
	magic, the function gets both args directly."

	| result |
	result := testModule @env1:___pyAttrLoad___: #greet_via_class.
	self assert: (result at: 1) equals: 9.
	self assert: (result at: 2) equals: 'hey'.
%

category: 'Grail-Tests'
method: ClassFunctionBindingTestCase
testFunctionOnInstanceIsNotBound
	"Storing a function on an INSTANCE does NOT trigger the descriptor
	protocol.  ``b.adhoc(99)'' calls adhoc(99) with no self prepended;
	if the wrap incorrectly fired on the instance path, we'd see the
	instance prepended (call would have 2 args, _adhoc expects 1)."

	self
		assert: (testModule @env1:___pyAttrLoad___: #function_on_instance_outcome)
		equals: 'got:99'.
%

category: 'Grail-Tests'
method: ClassFunctionBindingTestCase
testLastAssignmentWins
	"After two writes to Box.method, the last one is what binds."

	self
		assert: (testModule @env1:___pyAttrLoad___: #last_assignment_result)
		equals: 'second'.
%

category: 'Grail-Tests'
method: ClassFunctionBindingTestCase
testLambdaOnClass
	"Lambdas stored as class attributes bind the same as functions."

	self
		assert: (testModule @env1:___pyAttrLoad___: #lambda_on_instance)
		equals: 16.
%

category: 'Grail-Tests'
method: ClassFunctionBindingTestCase
testClassReadReturnsFunction
	"Box.greet (not via instance) returns the callable itself —
	calling it requires the explicit instance arg."

	| result |
	result := testModule @env1:___pyAttrLoad___: #class_read_returns_function_result.
	self assert: (result at: 1) equals: 3.
	self assert: (result at: 2) equals: 'direct'.
%

category: 'Grail-Tests'
method: ClassFunctionBindingTestCase
testInClassMethodStillWorks
	"In-class def regression check: the rewrite must not break the
	existing in-class instance method path."

	self
		assert: (testModule @env1:___pyAttrLoad___: #in_class_method_result)
		equals: 12.
%
