! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NoPositionalDefTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NoPositionalDefTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NoPositionalDefTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NoPositionalDefTestCase (issue #1434)
!
! A class-body def that declares no positional parameter and no *args --
! ``def h()'', ``def ko(*, x=3)'', or such a @classmethod -- has no parameter
! for Grail to strip into the Smalltalk receiver, so a call through an
! instance used to drop the instance and answer where CPython raises.  Such a
! def now opens with UnboundMethod >>
! ___refuseReceiver___:positional:kw:kwonly:qualifiedName:, which lets through
! only ___noReceiver___, the receiver a call through the class runs it against.
!
! Driven by tests/python/no_positional_def.py, whose EXPECTED table is CPython
! 3.14's output, messages included.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
NoPositionalDefTestCase removeAllMethods.
NoPositionalDefTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: NoPositionalDefTestCase
setUp
	(importlib @env1:modules) removeKey: #'no_positional_def' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/no_positional_def.py')
		name: 'no_positional_def'.
%

category: 'Grail-Setup'
method: NoPositionalDefTestCase
tearDown
	(importlib @env1:modules) removeKey: #'no_positional_def' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Tests'
method: NoPositionalDefTestCase
testEveryCallPathMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 35.
	bad := (testModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%
