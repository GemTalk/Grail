! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for InspectCallableInstanceSignatureTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'InspectCallableInstanceSignatureTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
InspectCallableInstanceSignatureTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! InspectCallableInstanceSignatureTestCase
!
! inspect.signature() of a callable INSTANCE is its class's __call__ with the
! bound self dropped, as in CPython.  Grail answered ``()'' for every such
! object, so getfullargspec reported no **kwargs and botocore refused its own
! ClientMethodAlias event handler -- boto3.client() raised ValueError.  See
! inspect._signature_from_call_method.
!
! Driven by tests/python/inspect_callable_instance_signature.py, whose EXPECTED
! table is CPython 3.14's output.  A function, a class and a bound method are
! the guards.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
InspectCallableInstanceSignatureTestCase removeAllMethods.
InspectCallableInstanceSignatureTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: InspectCallableInstanceSignatureTestCase
setUp
	(importlib @env1:modules) removeKey: #'inspect_callable_instance_signature' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/inspect_callable_instance_signature.py')
		name: 'inspect_callable_instance_signature'.
%

category: 'Grail-Setup'
method: InspectCallableInstanceSignatureTestCase
tearDown
	(importlib @env1:modules) removeKey: #'inspect_callable_instance_signature' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Tests'
method: InspectCallableInstanceSignatureTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 11.
	bad := (testModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
