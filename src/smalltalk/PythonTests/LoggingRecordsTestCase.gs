! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for LoggingRecordsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'LoggingRecordsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
LoggingRecordsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! LoggingRecordsTestCase - logging's records, formatting and chain (#1221, #1220)
! ===============================================================================
! The Grail half of tests/python/logging_records_and_formatting.py, which is
! self-running and so also checked under real CPython by check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
LoggingRecordsTestCase removeAllMethods.
LoggingRecordsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: LoggingRecordsTestCase
setUp

	importlib @env1:modules removeKey: #'logging_records_and_formatting' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/logging_records_and_formatting.py')
		name: 'logging_records_and_formatting'
%

category: 'Grail-Helpers'
method: LoggingRecordsTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: LoggingRecordsTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests'
method: LoggingRecordsTestCase
testAMissingMappingKeyIsACatchableKeyError
	"#1220: an uncatchable Smalltalk LookupError used to end the program."

	self assertAll: #('a_missing_mapping_key_raises_a_catchable_KeyError'
		'__missing___is_honoured'
		'defaultdict_is_honoured')
%

category: 'Grail-Tests'
method: LoggingRecordsTestCase
testEveryLoggerChainEndsAtRoot

	self assertAll: #('every_logger_chain_ends_at_root'
		'a_dotted_logger_hangs_from_its_parent'
		'a_logger_made_later_becomes_the_parent_of_earlier_descendants'
		'getLogger_root_is_the_root_logger')
%

category: 'Grail-Tests'
method: LoggingRecordsTestCase
testARecordCarriesCPythonsFieldsAndExtra

	self assertAll: #('a_format_names_the_callers_module_and_function'
		'a_record_carries_cpythons_fields'
		'extra_lands_on_the_record'
		'extra_may_not_overwrite_a_record_field'
		'a_lone_mapping_argument_formats_the_message'
		'stack_info_renders_a_stack')
%

category: 'Grail-Tests'
method: LoggingRecordsTestCase
testFormatterStyles

	self assertAll: #('brace_style'
		'dollar_style'
		'an_unknown_style_is_refused'
		'the_default_formatter_is_message_only')
%

category: 'Grail-Tests'
method: LoggingRecordsTestCase
testAnUnformattableRecordIsReportedNotRaised
	"CPython's handleError: --- Logging error --- on stderr, and the caller carries on."

	self assertAll: #('a_format_naming_a_missing_field_does_not_raise_out_of_the_call'
		'it_is_reported_as_a_logging_error_instead'
		'nothing_reached_the_stream')
%

category: 'Grail-Tests'
method: LoggingRecordsTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 20 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 20
%
