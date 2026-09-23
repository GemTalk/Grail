! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for IntFromBytesIterableTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'IntFromBytesIterableTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
IntFromBytesIterableTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! IntFromBytesIterableTestCase - int.from_bytes takes any iterable of ints
! ===============================================================================
! Grail required a bytes-like argument.  CPython takes ANY ITERABLE OF INTS,
! and its own stdlib relies on it: ipaddress parses a dotted quad with
! ``int.from_bytes(map(cls._parse_octet, octets), 'big')'' -- a map object --
! so CPython's ipaddress could not even be imported under Grail.
!
! The one-argument spelling was missing too: byteorder has defaulted to 'big'
! since CPython 3.11, and all three arguments are nameable as keywords.
!
! tests/python/int_from_bytes_iterable.py holds the 14 checks, run under real CPython
! 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
IntFromBytesIterableTestCase removeAllMethods.
IntFromBytesIterableTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: IntFromBytesIterableTestCase
setUp

	importlib @env1:modules removeKey: #'int_from_bytes_iterable' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/int_from_bytes_iterable.py')
		name: 'int_from_bytes_iterable'
%

category: 'Grail-Helpers'
method: IntFromBytesIterableTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: IntFromBytesIterableTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - int'
method: IntFromBytesIterableTestCase
testAnyIterableOfIntsIsAccepted

	self assertAll: #('a_bytes_like_still_works' 'a_list_or_tuple_of_ints_works'
		'a_generator_works' 'a_map_object_works_which_is_what_ipaddress_passes'
		'a_range_works_too' 'an_element_with_index_is_accepted'
		'an_empty_iterable_is_zero')
%

category: 'Grail-Tests - int'
method: IntFromBytesIterableTestCase
testByteorderAndSignedStillApply

	self assertAll: #('byteorder_still_applies_to_an_iterable'
		'signed_still_applies_to_an_iterable'
		'bool_from_bytes_narrows_an_iterable_too')
%

category: 'Grail-Tests - int'
method: IntFromBytesIterableTestCase
testWhatIsRefusedIsRefusedAsCPythonRefusesIt

	self assertAll: #('a_str_is_refused_before_it_is_iterated'
		'a_non_iterable_is_refused'
		'an_element_that_is_not_an_integer_is_refused'
		'an_element_out_of_range_is_refused')
%

category: 'Grail-Tests - int'
method: IntFromBytesIterableTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 14 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 14
%
