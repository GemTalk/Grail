! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ModuleClassZeroArgCallTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ModuleClassZeroArgCallTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ModuleClassZeroArgCallTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ModuleClassZeroArgCallTestCase
!
! ``m.C()'' with no arguments builds an instance of a native module's class
! (#1448, #1492).  The zero-argument call and the read ``m.C'' compiled to the
! same unary send, so an accessor answering a class answered the class:
! datetime.time(), timedelta(), tzinfo(), fractions.Fraction() and
! numbers.Number().  Those accessors are now filed under 'Grail-Type
! Accessors', which CallAst >> ___isValueAccessorCategory___: reads as
! load-then-call (#1025); ModuleAttrZeroArgCallTestCase covers the mechanism.
!
! Driven by tests/python/module_class_zero_arg_call.py, whose EXPECTED table is
! CPython 3.14's output; the rows spell each call literally, since that
! spelling is the bug.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ModuleClassZeroArgCallTestCase removeAllMethods.
ModuleClassZeroArgCallTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ModuleClassZeroArgCallTestCase
setUp
	(importlib @env1:modules) removeKey: #'module_class_zero_arg_call' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'module_class_zero_arg_call'.
%

category: 'Grail-Setup'
method: ModuleClassZeroArgCallTestCase
tearDown
	(importlib @env1:modules) removeKey: #'module_class_zero_arg_call' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: ModuleClassZeroArgCallTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/module_class_zero_arg_call.py'
%

category: 'Grail-Private'
method: ModuleClassZeroArgCallTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: ModuleClassZeroArgCallTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 23.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%

