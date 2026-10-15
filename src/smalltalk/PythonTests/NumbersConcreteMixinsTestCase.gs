! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NumbersConcreteMixinsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NumbersConcreteMixinsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NumbersConcreteMixinsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NumbersConcreteMixinsTestCase
!
! The numbers ABCs supply CPython's concrete mixins (#1619): Complex.__bool__ /
! __sub__ / __rsub__, Real.__complex__ / real / imag / conjugate / __divmod__ /
! __rdivmod__, Integral.__index__ / __float__ / numerator / denominator.  Only
! Rational.__float__ existed, so fractions.Fraction(3, 4).real raised
! AttributeError.  real / imag / numerator / denominator are read-only
! properties, declared to the class __dict__ as such.
!
! Driven by tests/python/numbers_concrete_mixins.py, whose EXPECTED table is
! CPython 3.14's output.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
NumbersConcreteMixinsTestCase removeAllMethods.
NumbersConcreteMixinsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: NumbersConcreteMixinsTestCase
setUp
	(importlib @env1:modules) removeKey: #'numbers_concrete_mixins' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'numbers_concrete_mixins'.
%

category: 'Grail-Setup'
method: NumbersConcreteMixinsTestCase
tearDown
	(importlib @env1:modules) removeKey: #'numbers_concrete_mixins' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: NumbersConcreteMixinsTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/numbers_concrete_mixins.py'
%

category: 'Grail-Private'
method: NumbersConcreteMixinsTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: NumbersConcreteMixinsTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 22.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%

