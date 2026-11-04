"
logging with no configuration prints warnings to stderr, as in CPython
(#2122): the module-level functions call basicConfig() when the root has no
handlers, and a record that finds no handler goes to logging.lastResort.
The checks are in tests/python/logging_last_resort.py, measured against
CPython 3.14; tests/scripts/test_grail_launcher.sh runs the same cases
through ./grail and compares both output streams.
"
Class {
	#name : 'LoggingLastResortTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
LoggingLastResortTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
LoggingLastResortTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
LoggingLastResortTestCase >> setUp [

	importlib @env1:modules removeKey: #'logging_last_resort' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/logging_last_resort.py')
		name: 'logging_last_resort'

]

{ #category : 'Grail-Tests' }
LoggingLastResortTestCase >> testBasicConfigAsInCPython [

	self assertAll: #('basicconfig_does_nothing_once_root_has_a_handler'
		'basicconfig_force_replaces_the_handler' 'basicconfig_takes_handlers'
		'basicconfig_refuses_an_unknown_argument'
		'basicconfig_refuses_stream_and_filename'
		'basicconfig_refuses_handlers_and_stream')

]

{ #category : 'Grail-Tests' }
LoggingLastResortTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists here name 15 checks.  A check added to the fixture without
	being listed would pass unasserted, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 15

]

{ #category : 'Grail-Tests' }
LoggingLastResortTestCase >> testExplicitHandlersDoNotDoubleUp [

	self assertAll: #('an_explicit_handler_is_the_only_one'
		'a_named_loggers_handler_is_the_only_one')

]

{ #category : 'Grail-Tests' }
LoggingLastResortTestCase >> testLastResort [

	self assertAll: #('a_named_logger_falls_back_to_last_resort'
		'last_resort_is_a_warning_level_stderr_handler'
		'last_resort_keeps_its_own_level'
		'without_last_resort_one_no_handlers_notice')

]

{ #category : 'Grail-Tests' }
LoggingLastResortTestCase >> testModuleFunctionsCallBasicConfig [

	self assertAll: #('module_warning_calls_basicconfig'
		'info_prints_nothing_but_still_configures'
		'every_module_function_calls_basicconfig')

]
