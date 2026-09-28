! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SslRuntimeGapsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SslRuntimeGapsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SslRuntimeGapsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SslRuntimeGapsTestCase - the gaps CPython's ssl.py and test_ssl ran into,
! outside _ssl itself
! ===============================================================================
!   * property     -- a @property inside an ``if'' in a class body is applied
!                     (FunctionDefAst ___decoratorRealisedByReclass___:).
!   * super        -- ``super().prop'' reads the parent's property and
!                     ``super(C, C).prop.__set__'' sets it (Super.gs,
!                     SuperBoundMethod.gs, ClassDefAst's
!                     ___grailOwnPropertyNames___).
!   * enum         -- _simple_enum builds a real enum; global_enum exports a
!                     functional enum's members; _old_convert_ exists
!                     (enum.gs, PyEnumTypes.gs).
!   * os           -- fsencode/fsdecode go through fspath; os.read takes a
!                     socket's fd (os.gs).
!   * socket       -- tuple addresses, recv_into(buf, n, flags), select on an
!                     fd (_socket_module.gs, select.py).
!   * time / mock  -- time.strptime, time._STRUCT_TM_ITEMS, mock.patch.dict.
!   * threading    -- Event.wait waits until set or the timeout (threading.py).
!
! tests/python/ssl_runtime_gaps.py holds the 13 checks, run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SslRuntimeGapsTestCase removeAllMethods.
SslRuntimeGapsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SslRuntimeGapsTestCase
setUp

	importlib @env1:modules removeKey: #'ssl_runtime_gaps' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/ssl_runtime_gaps.py')
		name: 'ssl_runtime_gaps'
%

category: 'Grail-Helpers'
method: SslRuntimeGapsTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: SslRuntimeGapsTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - property'
method: SslRuntimeGapsTestCase
testPropertyInsideAnIf

	self assertAll: #('a_property_defined_in_an_if_is_applied')
%

category: 'Grail-Tests - super'
method: SslRuntimeGapsTestCase
testSuperReadsAndSetsAParentProperty

	self assertAll: #('super_reads_and_sets_the_parent_property')
%

category: 'Grail-Tests - enum'
method: SslRuntimeGapsTestCase
testSimpleEnumGlobalEnumAndOldConvert

	self assertAll: #('simple_enum_makes_the_plain_class_an_enum'
		're_flags_are_a_global_int_flag'
		'old_convert_builds_without_exporting')
%

category: 'Grail-Tests - os'
method: SslRuntimeGapsTestCase
testFsencodeAndSocketDescriptors

	self assertAll: #('fsencode_and_fsdecode_refuse_a_non_path'
		'a_socket_fd_reads_and_selects'
		'a_closed_socket_fd_is_ebadf')
%

category: 'Grail-Tests - socket'
method: SslRuntimeGapsTestCase
testSocketAddressesAndRecvInto

	self assertAll: #('socket_addresses_are_tuples'
		'recv_into_takes_nbytes_and_flags')
%

category: 'Grail-Tests - time and mock'
method: SslRuntimeGapsTestCase
testStrptimeAndPatchDict

	self assertAll: #('time_strptime_is_available'
		'mock_patch_dict_patches_and_restores'
		'event_wait_blocks_until_set_or_timeout')
%

category: 'Grail-Tests - time and mock'
method: SslRuntimeGapsTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 13 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 13
%
