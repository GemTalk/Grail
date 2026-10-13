! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for LoggingManagerTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'LoggingManagerTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
LoggingManagerTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! LoggingManagerTestCase - Logger.manager, setLoggerClass, the level maps
! ===============================================================================
! pytest's logging plugin walks logging.root.manager.loggerDict when every
! session starts, and Grail's logging had no manager: every pytest run ended in
! an INTERNALERROR.  pip calls logging.setLoggerClass at import in nearly every
! one of its modules.  The manager is a view over the registry and disable
! level getLogger() and disable() use.
!
! It is assigned in Logger's class body.  logging is DEPLOYED at install, and
! a session that binds a deployed module does not run its body, so a store of
! ``Logger.manager'' after the class (CPython's spelling) was in the
! installing session and nowhere else.  These tests run in such a session.
! tests/python/logging_manager.py holds the 10 checks.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
LoggingManagerTestCase removeAllMethods.
LoggingManagerTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: LoggingManagerTestCase
setUp

	importlib @env1:modules removeKey: #'logging_manager' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/logging_manager.py')
		name: 'logging_manager'
%

category: 'Grail-Helpers'
method: LoggingManagerTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: LoggingManagerTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - manager'
method: LoggingManagerTestCase
testEveryLoggerReachesOneManager

	self assertAll: #('every_logger_shares_one_manager'
		'the_registry_holds_named_loggers_and_not_root'
		'disable_is_one_setting_read_two_ways')
%

category: 'Grail-Tests - manager'
method: LoggingManagerTestCase
testTheLoggerClassIsSettable

	self assertAll: #('set_logger_class_decides_what_getlogger_makes'
		'the_default_logger_class_is_logger'
		'a_class_not_derived_from_logger_is_refused'
		'a_logger_name_must_be_a_string')
%

category: 'Grail-Tests - manager'
method: LoggingManagerTestCase
testLevelNamesAndShutdown

	self assertAll: #('level_names_answer_both_ways' 'the_name_to_level_map'
		'shutdown_flushes_and_closes_the_handlers_given')
%

category: 'Grail-Tests - manager'
method: LoggingManagerTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 10 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 10
%
