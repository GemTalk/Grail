! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TimezoneKeywordsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TimezoneKeywordsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
TimezoneKeywordsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! TimezoneKeywordsTestCase - datetime.timezone binds offset and name by keyword
! ===============================================================================
! timezone(offset, name) takes both as ordinary parameters, so either may come
! by keyword: annotated-types builds its cases with timezone(offset=...).
! Grail refused any keyword ('PyTimezone() takes no keyword arguments'), so
! its test module failed to collect.
! tests/python/timezone_keywords.py holds the 6 checks.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TimezoneKeywordsTestCase removeAllMethods.
TimezoneKeywordsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: TimezoneKeywordsTestCase
setUp

	importlib @env1:modules removeKey: #'timezone_keywords' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/timezone_keywords.py')
		name: 'timezone_keywords'
%

category: 'Grail-Helpers'
method: TimezoneKeywordsTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: TimezoneKeywordsTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - keywords'
method: TimezoneKeywordsTestCase
testOffsetAndNameBindByKeyword

	self assertAll: #('offset_by_keyword' 'offset_and_name_by_keyword' 'name_by_keyword'
		'a_zero_offset_by_keyword_is_utc' 'positional_unchanged')
%

category: 'Grail-Tests - keywords'
method: TimezoneKeywordsTestCase
testABadCallSaysWhatCPythonSays

	self assertAll: #('refusals')
%

category: 'Grail-Tests - keywords'
method: TimezoneKeywordsTestCase
testEveryFixtureCheckIsAssertedByATestHere

	self assert: (self results @env1:__len__) equals: 6
%
