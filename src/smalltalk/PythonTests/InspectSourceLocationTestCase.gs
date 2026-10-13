! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for InspectSourceLocationTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'InspectSourceLocationTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
InspectSourceLocationTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! InspectSourceLocationTestCase - inspect.getfile / findsource, frame first lines
! ===============================================================================
! pytest renders every traceback entry of a failure from inspect.getfile and
! inspect.findsource.  getfile answered '<unknown>' for everything and
! findsource did not exist, so each entry printed as ``<unknown>:361'' with
! ``???'' for its source; a frame's f_code carried co_firstlineno 0; and
! inspect.BlockFinder, which pytest constructs, was missing.
!
! tests/python/inspect_source_location.py holds the 20 checks, run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
InspectSourceLocationTestCase removeAllMethods.
InspectSourceLocationTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: InspectSourceLocationTestCase
setUp

	importlib @env1:modules removeKey: #'inspect_source_location' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/inspect_source_location.py')
		name: 'inspect_source_location'
%

category: 'Grail-Helpers'
method: InspectSourceLocationTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: InspectSourceLocationTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - inspect'
method: InspectSourceLocationTestCase
testGetfileAndGetsourcefile

	self assertAll: #('getfile_of_a_bound_method'
		'getfile_of_a_frame'
		'getfile_of_a_function'
		'getfile_of_a_traceback'
		'getfile_of_its_code'
		'getfile_of_the_module'
		'getfile_refuses_a_non_code_object'
		'getsourcefile_of_a_function')
%

category: 'Grail-Tests - inspect'
method: InspectSourceLocationTestCase
testFindsource

	self assertAll: #('findsource_lines_are_the_file'
		'findsource_of_a_frame'
		'findsource_of_a_function'
		'findsource_of_a_method'
		'findsource_of_a_traceback'
		'findsource_of_the_module')
%

category: 'Grail-Tests - inspect'
method: InspectSourceLocationTestCase
testFrameCodeStartsAtItsDef

	self assertAll: #('classmethod_frame_firstlineno'
		'frame_firstlineno_is_the_def_line'
		'method_frame_firstlineno'
		'traceback_frame_firstlineno')
%

category: 'Grail-Tests - inspect'
method: InspectSourceLocationTestCase
testBlockFinder

	self assertAll: #('blockfinder_constructs'
		'endofblock_is_an_exception')
%

category: 'Grail-Tests - inspect'
method: InspectSourceLocationTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 20 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 20
%
