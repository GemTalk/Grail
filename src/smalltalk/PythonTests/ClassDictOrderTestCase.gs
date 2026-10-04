! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassDictOrderTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassDictOrderTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassDictOrderTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassDictOrderTestCase - a class __dict__ lists the body in source order
! ===============================================================================
! tests/python/class_dict_order.py holds the checks, each measured against
! CPython 3.14.6 and run there by scripts/check_python_fixtures.sh.  One test
! per mechanism, so a regression names the layer it came from.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassDictOrderTestCase removeAllMethods.
ClassDictOrderTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassDictOrderTestCase
setUp

	importlib @env1:modules removeKey: #'class_dict_order' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_dict_order.py')
		name: 'class_dict_order'
%

category: 'Grail-Helpers'
method: ClassDictOrderTestCase
assertAll: names

	| results |
	results := testModule @env1:___pyAttrLoad___: #RESULTS.
	names do: [:name | | result |
		result := results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests'
method: ClassDictOrderTestCase
testBodyNamesInSourceOrder
	"object >> ___grailInBodyOrder___: re-keys the __dict__ snapshot by
	ClassDefAst's ___classBodyOrder___."

	self assertAll: #('body_names_in_source_order' 'slots_in_source_order'
		'vars_agrees')
%

category: 'Grail-Tests'
method: ClassDictOrderTestCase
testWhatTypeNewAddsFollowsTheBody
	"Slot descriptors, then a None __doc__, then attributes set later."

	self assertAll: #('no_docstring_puts_doc_last' 'empty_class'
		'slot_descriptors_follow_the_body' 'attribute_set_later_follows_the_body')
%
