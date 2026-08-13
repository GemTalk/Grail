! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'EnvVarGuardTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnvVarGuardTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnvVarGuardTestCase - test.support.os_helper.EnvironmentVarGuard
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnvVarGuardTestCase removeAllMethods.
EnvVarGuardTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - test support'
method: EnvVarGuardTestCase
testEnvironmentVarGuard
	"os_helper.EnvironmentVarGuard saves os.environ, lets a test mutate it,
	and restores it on exit.

	The vendored suite uses it to change the session's zone and put it back
	-- time.tzset() reads os.environ['TZ'] -- and Grail's trimmed os_helper
	omitted it, so datetimetester's test_system_transitions died on
	``module has no attribute 'EnvironmentVarGuard''' before running at all.

	Ported faithfully rather than stubbed for that one caller: the full
	MutableMapping over os.environ, with every change rolled back on exit --
	a name written twice still restores to its ORIGINAL value, a name
	DELETED inside the guard comes back, a name that did not exist
	beforehand is removed again, and the restore happens even when the body
	raises."

	| mod results |
	importlib @env1:modules removeKey: #'env_var_guard' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/env_var_guard.py')
		name: 'env_var_guard'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#('reads_through_guard' 'sees_own_write' 'sees_new_name'
	  'set_helper' 'unset_helper' 'copy_is_dict' 'len_and_contains'
	  'restores_existing' 'removes_new'
	  'delete_takes_effect' 'restores_deleted' 'restores_on_exception'
	  'tz_change_visible' 'tz_restored') do: [:key |
		self assert: ((results @env1:__getitem__: key) = true) description: key]
%
