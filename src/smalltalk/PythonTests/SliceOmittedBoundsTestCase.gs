! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SliceOmittedBoundsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SliceOmittedBoundsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SliceOmittedBoundsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SliceOmittedBoundsTestCase - x[1:3] hands __getitem__ None for an omitted bound
! ===============================================================================
! Codegen builds the slice with Smalltalk nil for an omitted bound, and a Python
! read of it answered the slice's own accessor as a bound method: key.step was
! not None, repr showed <UndefinedObject>, and x[1:3] == slice(1, 3) was False.
! pytest's Source.__getitem__ raised on every failure report.
!
! tests/python/slice_omitted_bounds.py holds the 15 checks, run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SliceOmittedBoundsTestCase removeAllMethods.
SliceOmittedBoundsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SliceOmittedBoundsTestCase
setUp

	importlib @env1:modules removeKey: #'slice_omitted_bounds' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/slice_omitted_bounds.py')
		name: 'slice_omitted_bounds'
%

category: 'Grail-Helpers'
method: SliceOmittedBoundsTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: SliceOmittedBoundsTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - slice'
method: SliceOmittedBoundsTestCase
testOmittedBoundsReadAsNone

	self assertAll: #('step_omitted' 'stop_and_step_omitted' 'start_and_step_omitted'
		'everything_omitted' 'only_step' 'all_three_given' 'step_is_none_not_a_method'
		'bounds_from_names')
%

category: 'Grail-Tests - slice'
method: SliceOmittedBoundsTestCase
testAWrittenSliceEqualsTheConstructedOne

	self assertAll: #('repr' 'equal_to_the_constructed_slice'
		'hash_agrees_with_the_constructed_slice' 'usable_as_a_dict_key' 'indices')
%

category: 'Grail-Tests - slice'
method: SliceOmittedBoundsTestCase
testPytestSourceAndBuiltinSequences

	self assertAll: #('pytest_source_slice' 'builtin_sequences')
%

category: 'Grail-Tests - slice'
method: SliceOmittedBoundsTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 15 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 15
%
