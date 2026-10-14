! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for StructFormatWhitespaceTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'StructFormatWhitespaceTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
StructFormatWhitespaceTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! StructFormatWhitespaceTestCase
!
! struct skips whitespace between format codes, as CPython's parser does --
! pytz reads its zone files with '>4s c 15x 6l', which Grail rejected as a
! ``bad char in struct format''.  See struct >> _parse:.
!
! Driven by tests/python/struct_format_whitespace.py, whose EXPECTED table is
! CPython 3.14's output.  Whitespace before the byte-order prefix and inside a
! repeat count are still errors.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
StructFormatWhitespaceTestCase removeAllMethods.
StructFormatWhitespaceTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: StructFormatWhitespaceTestCase
setUp
	(importlib @env1:modules) removeKey: #'struct_format_whitespace' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'struct_format_whitespace'.
%

category: 'Grail-Setup'
method: StructFormatWhitespaceTestCase
tearDown
	(importlib @env1:modules) removeKey: #'struct_format_whitespace' ifAbsent: [].
	testModule := nil
%

category: 'Grail-Private'
method: StructFormatWhitespaceTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/struct_format_whitespace.py'
%

category: 'Grail-Private'
method: StructFormatWhitespaceTestCase
___mismatchesIn___: aModule
	^ (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: #() kw: nil
%

category: 'Grail-Tests'
method: StructFormatWhitespaceTestCase
testEveryRowMatchesCPython
	| expected bad |
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 16.
	bad := self ___mismatchesIn___: testModule.
	self
		assert: (bad @env1:__len__) = 0
		description: (builtins @env1:instance @env1:repr: bad) asString
%

