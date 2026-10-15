Class {
	#name : 'LoggingManagerTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
LoggingManagerTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
LoggingManagerTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
LoggingManagerTestCase >> setUp [

	importlib @env1:modules removeKey: #'logging_manager' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/logging_manager.py')
		name: 'logging_manager'

]

{ #category : 'Grail-Tests - manager' }
LoggingManagerTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 10 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 10

]

{ #category : 'Grail-Tests - manager' }
LoggingManagerTestCase >> testEveryLoggerReachesOneManager [

	self assertAll: #('every_logger_shares_one_manager'
		'the_registry_holds_named_loggers_and_not_root'
		'disable_is_one_setting_read_two_ways')

]

{ #category : 'Grail-Tests - manager' }
LoggingManagerTestCase >> testLevelNamesAndShutdown [

	self assertAll: #('level_names_answer_both_ways' 'the_name_to_level_map'
		'shutdown_flushes_and_closes_the_handlers_given')

]

{ #category : 'Grail-Tests - manager' }
LoggingManagerTestCase >> testTheLoggerClassIsSettable [

	self assertAll: #('set_logger_class_decides_what_getlogger_makes'
		'the_default_logger_class_is_logger'
		'a_class_not_derived_from_logger_is_refused'
		'a_logger_name_must_be_a_string')

]
