! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ObjectNewArgsAndSurrogateWarningsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ObjectNewArgsAndSurrogateWarningsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ObjectNewArgsAndSurrogateWarningsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ObjectNewArgsAndSurrogateWarningsTestCase - the gaps PR #1205 left open
! ===============================================================================
!   * object_new    -- ``class A: pass; A(42)'' raises ``A() takes no
!                      arguments'', and only for a class whose every __init__
!                      and __new__ is object's (object >>
!                      ___grailInheritsObjectInitAndNew___).
!   * property      -- ``type(property(f))'' is builtins.property by name.
!   * surrogates    -- formatwarning, showwarning, the registry key and the
!                      message filter keep a lone surrogate (warnings >>
!                      ___joinedText___: / ___keyText___:); the console escapes
!                      it (___backslashReplaced___:).
!   * pins          -- an abstract property makes an ABC abstract; a read-only
!                      property's message uses __qualname__.  PR #1205 listed
!                      both as gaps, wrongly.
!
! tests/python/object_new_args_and_surrogate_warnings.py holds the 7 checks,
! run under real CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ObjectNewArgsAndSurrogateWarningsTestCase removeAllMethods.
ObjectNewArgsAndSurrogateWarningsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ObjectNewArgsAndSurrogateWarningsTestCase
setUp

	importlib @env1:modules removeKey: #'object_new_args_and_surrogate_warnings' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/object_new_args_and_surrogate_warnings.py')
		name: 'object_new_args_and_surrogate_warnings'
%

category: 'Grail-Helpers'
method: ObjectNewArgsAndSurrogateWarningsTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: ObjectNewArgsAndSurrogateWarningsTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - object'
method: ObjectNewArgsAndSurrogateWarningsTestCase
testOnlyObjectsInitAndNewRejectArguments

	self assertAll: #('only_a_class_with_object_s_init_and_new_rejects_arguments')
%

category: 'Grail-Tests - object'
method: ObjectNewArgsAndSurrogateWarningsTestCase
testThePropertyTypeIsBuiltinsProperty

	self assertAll: #('the_property_type_is_builtins_property')
%

category: 'Grail-Tests - pins'
method: ObjectNewArgsAndSurrogateWarningsTestCase
testAbstractPropertyAndReadOnlyMessage

	self assertAll: #('an_abstract_property_makes_the_class_abstract'
		'a_read_only_property_names_the_class_by_qualname')
%

category: 'Grail-Tests - surrogates'
method: ObjectNewArgsAndSurrogateWarningsTestCase
testWarningsKeepALoneSurrogate

	self assertAll: #('formatwarning_keeps_a_lone_surrogate'
		'showwarning_writes_a_lone_surrogate_to_its_file'
		'a_lone_surrogate_message_warns_and_is_filtered')
%

category: 'Grail-Tests - surrogates'
method: ObjectNewArgsAndSurrogateWarningsTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 7 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 7
%
