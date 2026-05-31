! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FourArgAttrCallTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FourArgAttrCallTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
FourArgAttrCallTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FourArgAttrCallTestCase — a 4-argument method reached via the load-then-call
! path (chained-attribute or unknown-typed receiver) must resolve.
! ___pyAttrLoad___ used to enumerate only 1..3 fixed-arity selectors + varargs,
! so a 4-arg method (name:_:_:_:) raised AttributeError.  werkzeug routing's
! StateMachineMatcher.match(domain, path, method, websocket) is this shape.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FourArgAttrCallTestCase removeAllMethods.
FourArgAttrCallTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-FourArgAttr'
method: FourArgAttrCallTestCase
loadFixture
	"Load tests/python/four_arg_attr_call.py fresh."

	importlib @env1:modules @env0:removeKey: #'four_arg_attr_call' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir @env0:, '/tests/python/four_arg_attr_call.py')
		name: 'four_arg_attr_call'
%

category: 'Grail-Tests-FourArgAttr'
method: FourArgAttrCallTestCase
testCall4ArgViaAttributeChain
	"``h.m.match(1,2,3,4)`` — chained-attribute receiver routes through
	___pyAttrLoad___; the 4-arg method must be found and called."

	| r |
	r := self loadFixture @env1:call_4arg_via_attribute_chain.
	self assert: r @env0:size equals: 4.
	self assert: (r @env1:__getitem__: 0) equals: 1.
	self assert: (r @env1:__getitem__: 3) equals: 4
%

category: 'Grail-Tests-FourArgAttr'
method: FourArgAttrCallTestCase
testCall4ArgOnLocal
	"``m.match('a','b','c','d')`` on a local of unknown static type."

	| r |
	r := self loadFixture @env1:call_4arg_on_local.
	self assert: r @env0:size equals: 4.
	self assert: (r @env1:__getitem__: 0) equals: 'a'.
	self assert: (r @env1:__getitem__: 3) equals: 'd'
%

category: 'Grail-Tests-FourArgAttr'
method: FourArgAttrCallTestCase
testFourArgBoundMethodReference
	"``f = m.match; f(10,20,30,40)`` — an explicit 4-arg BoundMethod
	handle dispatches correctly."

	| r |
	r := self loadFixture @env1:four_arg_bound_method_reference.
	self assert: (r @env1:__getitem__: 0) equals: 10.
	self assert: (r @env1:__getitem__: 3) equals: 40
%
