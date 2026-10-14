! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DatetimeSecondBaseTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DatetimeSecondBaseTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DatetimeSecondBaseTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DatetimeSecondBaseTestCase - a datetime class listed after a plain mixin
! ===============================================================================
! ``class Time(Item, time)'' (tomlkit) must keep time as its Smalltalk
! superclass: the datetime classes build instances class-side and check
! operands with isKindOf:.  Grail picked Item by chain depth and the
! construction died with an uncatchable MNU.  replace() on such a subclass
! must pass fold only when it is 1, as CPython does.
! tests/python/datetime_second_base.py holds the 9 checks.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DatetimeSecondBaseTestCase removeAllMethods.
DatetimeSecondBaseTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: DatetimeSecondBaseTestCase
setUp

	importlib @env1:modules removeKey: #'datetime_second_base' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/datetime_second_base.py')
		name: 'datetime_second_base'
%

category: 'Grail-Helpers'
method: DatetimeSecondBaseTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: DatetimeSecondBaseTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - bases'
method: DatetimeSecondBaseTestCase
testEachDatetimeClassAsASecondBase

	self assertAll: #('time_second_base' 'date_second_base' 'datetime_second_base'
		'timedelta_second_base' 'tzinfo_second_base' 'the_mro'
		'a_mixin_method_precedes_the_base')
%

category: 'Grail-Tests - replace'
method: DatetimeSecondBaseTestCase
testReplaceCallsTheSubclassAsCPythonDoes

	self assertAll: #('replace_keeps_the_subclass_without_passing_fold'
		'replace_passes_fold_only_when_it_is_one')
%

category: 'Grail-Tests - bases'
method: DatetimeSecondBaseTestCase
testEveryFixtureCheckIsAssertedByATestHere

	self assert: (self results @env1:__len__) equals: 9
%
