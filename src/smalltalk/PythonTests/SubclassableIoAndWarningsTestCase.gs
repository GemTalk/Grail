! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SubclassableIoAndWarningsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SubclassableIoAndWarningsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SubclassableIoAndWarningsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SubclassableIoAndWarningsTestCase - #1459
! ===============================================================================
!   warnings.catch_warnings is a class (CPython's, _grail_catch_warnings,
!   served by warnings >> __getattr__: so a read is the class and a call an
!   instance), and a Python subclass of io.TextIOWrapper is rooted at _pyio's
!   buffer-wrapping TextIOWrapper (Class >> ___subclass___:...).  pytest's
!   WarningsRecorder and CaptureIO / TeeCaptureIO / EncodedFile are the shapes.
!
! tests/python/subclassable_io_and_warnings.py holds the 12 checks, run under
! real CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SubclassableIoAndWarningsTestCase removeAllMethods.
SubclassableIoAndWarningsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SubclassableIoAndWarningsTestCase
setUp
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/subclassable_io_and_warnings.py'
		name: 'subclassable_io_and_warnings'
%

category: 'Grail-Helpers'
method: SubclassableIoAndWarningsTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: SubclassableIoAndWarningsTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests'
method: SubclassableIoAndWarningsTestCase
testCatchWarningsIsAClass

	self assertAll: #('catch_warnings_is_a_class' 'call_makes_an_instance' 'repr'
		'record' 'action_shorthand' 'reentry_errors')
%

category: 'Grail-Tests'
method: SubclassableIoAndWarningsTestCase
testPytestWarningsRecorder

	self assertAll: #('pytest_recorder_reusable')
%

category: 'Grail-Tests'
method: SubclassableIoAndWarningsTestCase
testTextIOWrapperSubclassesWrapABuffer

	self assertAll: #('capture_io_writes_to_its_buffer' 'tee_capture_super_write'
		'encoded_file' 'read_back' 'subclass_is_a_textiowrapper')
%

category: 'Grail-Tests - coverage'
method: SubclassableIoAndWarningsTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 12 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 12
%
