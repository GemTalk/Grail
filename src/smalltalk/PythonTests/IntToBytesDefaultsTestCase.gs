! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for IntToBytesDefaultsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'IntToBytesDefaultsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
IntToBytesDefaultsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! IntToBytesDefaultsTestCase - int.to_bytes defaults its length and byteorder
! ===============================================================================
! CPython has defaulted length to 1 and byteorder to 'big' since 3.11, so
! ``(12).to_bytes()'' and ``(258).to_bytes(4)'' are what code written since
! then says.  Grail had only the two- and three-argument forms, so both raised
! TypeError -- and CPython's own ipaddress writes ``self._ip.to_bytes(4)''.
!
! All three arguments are nameable as keywords in CPython too.
!
! tests/python/int_to_bytes_defaults.py holds the 9 checks, run under real CPython 3.14
! by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
IntToBytesDefaultsTestCase removeAllMethods.
IntToBytesDefaultsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: IntToBytesDefaultsTestCase
setUp

	importlib @env1:modules removeKey: #'int_to_bytes_defaults' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/int_to_bytes_defaults.py')
		name: 'int_to_bytes_defaults'
%

category: 'Grail-Helpers'
method: IntToBytesDefaultsTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: IntToBytesDefaultsTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - int'
method: IntToBytesDefaultsTestCase
testTheDefaultedFormsAnswerWhatCPythonAnswers

	self assertAll: #('no_arguments_is_one_big_endian_byte'
		'a_length_alone_is_big_endian' 'a_length_of_zero_is_empty'
		'the_two_and_three_argument_forms_still_work'
		'every_argument_is_nameable')
%

category: 'Grail-Tests - int'
method: IntToBytesDefaultsTestCase
testAValueThatDoesNotFitStillOverflows

	self assertAll: #('a_value_too_big_for_the_default_length_overflows'
		'a_negative_value_needs_signed')
%

category: 'Grail-Tests - int'
method: IntToBytesDefaultsTestCase
testBoolInheritsItAndTheRoundTripHolds

	self assertAll: #('bool_to_bytes_defaults_too'
		'to_bytes_and_from_bytes_answer_each_other')
%

category: 'Grail-Tests - int'
method: IntToBytesDefaultsTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 9 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 9
%
