! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MethodArityMessageTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MethodArityMessageTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MethodArityMessageTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MethodArityMessageTestCase
!
! A method's ``takes N positional arguments but M were given'' counts its
! receiver, as CPython's does: ``def ok(self)'' called ``C().ok(1)'' takes 1
! but 2 were given.  Checks the three paths that produce it together: the
! generated arity checks (#1472), the class-side fallback for a fixed-arity
! @classmethod / @staticmethod (#1484), and the instance-side one for a def
! with no parameters (BoundMethod >> ___instanceSideArityMessageFor___:given:).
!
! Driven by tests/python/method_arity_messages.py, whose EXPECTED table is
! CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MethodArityMessageTestCase removeAllMethods.
MethodArityMessageTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: MethodArityMessageTestCase
setUp
	(importlib @env1:modules) removeKey: #'method_arity_messages' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/method_arity_messages.py')
		name: 'method_arity_messages'.
%

category: 'Grail-Setup'
method: MethodArityMessageTestCase
tearDown
	(importlib @env1:modules) removeKey: #'method_arity_messages' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Tests'
method: MethodArityMessageTestCase
testEveryMessageMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 28.
	bad := (testModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
