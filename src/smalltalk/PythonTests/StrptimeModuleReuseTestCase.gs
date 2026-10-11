! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for StrptimeModuleReuseTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'StrptimeModuleReuseTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
StrptimeModuleReuseTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! StrptimeModuleReuseTestCase
!
! EVERY strptime REUSES THE ONE IMPORTED _strptime (#1222).  datetime, date
! and time (the classes) and time.strptime (the module function) delegate to
! the vendored _strptime, and each of them called importlib's LOADER --
! loadModuleFromPath:name: -- which never consults sys.modules.  So every call
! rebuilt the module from source (~310 ms), threw away its TimeRE and regex
! caches, and left a new module in sys.modules; a loop of about 200 calls ran
! the session out of temporary object memory.
!
! The callers now go through importlib class >> ___runtimeModule___:, which
! answers the registered module and loads only on a miss.
!
! Fixture: tests/python/strptime_module_reuse.py (self-verifying under CPython
! 3.14 -- all 9 checks pass there unchanged).
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
StrptimeModuleReuseTestCase removeAllMethods.
StrptimeModuleReuseTestCase class removeAllMethods.
%

category: 'Grail-Setup'
method: StrptimeModuleReuseTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #strptime_module_reuse ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/strptime_module_reuse.py')
		name: 'strptime_module_reuse'.
%

category: 'Grail-Private'
method: StrptimeModuleReuseTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests'
method: StrptimeModuleReuseTestCase
testEachStrptimeKeepsTheSameModule
	"The headline: two calls in a row leave the same _strptime in sys.modules,
	for each of the four entry points."

	#('datetime_strptime' 'date_strptime' 'time_class_strptime'
	  'time_module_strptime')
		do: [:key | self assertMatchesCPythonAt: key].
%

category: 'Grail-Tests'
method: StrptimeModuleReuseTestCase
testAnExplicitImportIsTheSameModule
	"``import _strptime'' and the strptime methods share one module, so what
	it caches -- the TimeRE and the per-format regexes -- survives a call."

	#('import_and_methods_share_it' 'time_re_cache_kept' 'regex_cache_kept')
		do: [:key | self assertMatchesCPythonAt: key].
%

category: 'Grail-Tests - Controls'
method: StrptimeModuleReuseTestCase
testTheAnswersAreUnchanged
	"Parsed values and the mismatch error are what they were."

	self assertMatchesCPythonAt: 'values'.
	self assertMatchesCPythonAt: 'error_is_unchanged'.
%

category: 'Grail-Tests - Controls'
method: StrptimeModuleReuseTestCase
testRuntimeModuleRefusesAMissingModule
	"The helper's miss: no file on the search path is an ImportError, not nil
	-- nil would surface later as an MNU far from the cause."

	| raised |
	raised := false.
	[importlib @env1:___runtimeModule___: 'grail_no_such_module_1222']
		on: ImportError
		do: [:ex | raised := true. ex return: nil].
	self assert: raised
%

category: 'Grail-Tests - Controls'
method: StrptimeModuleReuseTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check would stop being
	asserted and nothing would go red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '9 checks, 0 disagreeing [], keys match: True'
%
