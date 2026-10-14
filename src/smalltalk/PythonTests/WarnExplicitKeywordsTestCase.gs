! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for WarnExplicitKeywordsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'WarnExplicitKeywordsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
WarnExplicitKeywordsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! WarnExplicitKeywordsTestCase - warn_explicit's required arguments by keyword
! ===============================================================================
! pytest's assertion rewriter warns about an always-true assert with
! ``warn_explicit(msg, category=None, filename=..., lineno=...)'', and Grail's
! warn_explicit took its four required arguments by position only: the test
! module failed to collect (pyyaml's legacy tests).
! tests/python/warn_explicit_keywords.py holds the 5 checks.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
WarnExplicitKeywordsTestCase removeAllMethods.
WarnExplicitKeywordsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: WarnExplicitKeywordsTestCase
setUp

	importlib @env1:modules removeKey: #'warn_explicit_keywords' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/warn_explicit_keywords.py')
		name: 'warn_explicit_keywords'
%

category: 'Grail-Helpers'
method: WarnExplicitKeywordsTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: WarnExplicitKeywordsTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - keywords'
method: WarnExplicitKeywordsTestCase
testRequiredArgumentsBindByKeyword

	self assertAll: #('pytests_call_shape' 'every_required_argument_by_keyword'
		'positional_still_works')
%

category: 'Grail-Tests - keywords'
method: WarnExplicitKeywordsTestCase
testAMissingArgumentIsNamed

	self assertAll: #('a_missing_lineno_names_itself' 'a_missing_filename_names_itself')
%

category: 'Grail-Tests - keywords'
method: WarnExplicitKeywordsTestCase
testEveryFixtureCheckIsAssertedByATestHere

	self assert: (self results @env1:__len__) equals: 5
%
