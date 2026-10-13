! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SignatureBindTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SignatureBindTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SignatureBindTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SignatureBindTestCase
!
! inspect.Signature.bind() and bind_partial() map a call onto the
! parameters and raise CPython's TypeErrors, as in CPython.  Both were stubs
! that returned an empty BoundArguments and never raised, so a call validated
! with bind passed however wrong it was (#1548).  See inspect.Signature._bind.
!
! Driven by tests/python/signature_bind.py, whose EXPECTED table is CPython
! 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SignatureBindTestCase removeAllMethods.
SignatureBindTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SignatureBindTestCase
setUp
	(importlib @env1:modules) removeKey: #'signature_bind' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/signature_bind.py')
		name: 'signature_bind'.
%

category: 'Grail-Setup'
method: SignatureBindTestCase
tearDown
	(importlib @env1:modules) removeKey: #'signature_bind' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Tests'
method: SignatureBindTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 27.
	bad := (testModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
