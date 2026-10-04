! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DerivedPropertyWinsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DerivedPropertyWinsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DerivedPropertyWinsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DerivedPropertyWinsTestCase - a property on a subclass wins over the one it overrides
! ===============================================================================
! tests/python/derived_property_wins.py holds the checks, each measured against
! CPython 3.14.6 and run there by scripts/check_python_fixtures.sh.  One test
! per mechanism, so a regression names the layer it came from.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DerivedPropertyWinsTestCase removeAllMethods.
DerivedPropertyWinsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: DerivedPropertyWinsTestCase
setUp

	importlib @env1:modules removeKey: #'derived_property_wins' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/derived_property_wins.py')
		name: 'derived_property_wins'
%

category: 'Grail-Helpers'
method: DerivedPropertyWinsTestCase
assertAll: names

	| results |
	results := testModule @env1:___pyAttrLoad___: #RESULTS.
	names do: [:name | | result |
		result := results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests'
method: DerivedPropertyWinsTestCase
testANearerDataDescriptorWinsThePairRead
	"object >> ___grailDerivedDataDescriptorFor: -- asked before the pair read
	performs an ancestor's getter."

	self assertAll: #('property_set_on_the_subclass_later'
		'deleter_only_reads_the_inherited_getter' 'deleter_only_deletes'
		'decorator_returning_a_property' 'getattr_agrees')
%

category: 'Grail-Tests'
method: DerivedPropertyWinsTestCase
testWhatAlreadyWorkedStillDoes
	"The accessor forms that compile their own half, and an instance attribute
	behind a class value of the same name."

	self assertAll: #('setter_only_reads_the_inherited_getter' 'setter_only_sets'
		'getter_only_reads_its_own_getter' 'class_value_does_not_outrank_the_instance'
		'base_is_unchanged')
%
