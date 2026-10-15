! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for OverrideDocstringTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'OverrideDocstringTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
OverrideDocstringTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! OverrideDocstringTestCase - an undocumented override reports None (#1650)
! ===============================================================================
! A class-body def's docstring lives in its class's ___methodDocTable___, and
! the read walks the superclass chain.  The table held documented defs only,
! so an override without a docstring had no entry and reported its BASE
! method's docstring.  google-auth's copy_docstring decorator raises on a
! method that already has one, which cost 18 of its submodules their import.
! The table now records an undocumented def as nil, and the walk stops at it.
! tests/python/override_docstrings.py holds the 10 checks.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
OverrideDocstringTestCase removeAllMethods.
OverrideDocstringTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: OverrideDocstringTestCase
setUp

	importlib @env1:modules removeKey: #'override_docstrings' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/override_docstrings.py')
		name: 'override_docstrings'
%

category: 'Grail-Helpers'
method: OverrideDocstringTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: OverrideDocstringTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - overrides'
method: OverrideDocstringTestCase
testAnUndocumentedOverrideIsNone

	self assertAll: #('a_decorator_sees_no_docstring_on_an_override'
		'an_undocumented_override_is_none' 'every_method_kind_is_none_when_overridden'
		'the_nearest_definition_decides' 'several_bases_follow_the_mro')
%

category: 'Grail-Tests - overrides'
method: OverrideDocstringTestCase
testGoogleAuthCopyDocstringDecoratesAnOverride

	self assertAll: #('google_auth_copy_docstring_decorates_an_override')
%

category: 'Grail-Tests - overrides'
method: OverrideDocstringTestCase
testWhatAlreadyWorkedStillDoes

	self assertAll: #('an_inherited_method_still_reports_its_base'
		'an_alias_is_the_base_function' 'a_setter_keeps_the_getter_docstring'
		'a_redefinition_without_a_docstring_is_none')
%

category: 'Grail-Tests - overrides'
method: OverrideDocstringTestCase
testEveryFixtureCheckIsAssertedByATestHere

	self assert: (self results @env1:__len__) equals: 10
%
