! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassDictEntriesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassDictEntriesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassDictEntriesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassDictEntriesTestCase - the entries type.__new__ and the compiler add
! ===============================================================================
! tests/python/class_dict_entries.py holds the checks, each measured against
! CPython 3.14.6 and run there by scripts/check_python_fixtures.sh.  One test
! per mechanism, so a regression names the layer it came from.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassDictEntriesTestCase removeAllMethods.
ClassDictEntriesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassDictEntriesTestCase
setUp

	importlib @env1:modules removeKey: #'class_dict_entries' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_dict_entries.py')
		name: 'class_dict_entries'
%

category: 'Grail-Helpers'
method: ClassDictEntriesTestCase
assertAll: names

	| results |
	results := testModule @env1:___pyAttrLoad___: #RESULTS.
	names do: [:name | | result |
		result := results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests'
method: ClassDictEntriesTestCase
testFirstlinenoAndStaticAttributes
	"ClassDefAst stores both in the class's holder as the build starts
	(___staticAttributeNames___, the first decorator's line)."

	self assertAll: #('static_attributes' 'static_attributes_in_the_dict'
		'nested_class_counts_for_itself' 'firstlineno_is_the_first_decorator'
		'firstlineno_is_an_int' 'subclass_has_its_own'
		'instance_reads_through_the_class' 'type_class_has_neither')
%

category: 'Grail-Tests'
method: ClassDictEntriesTestCase
testDictAndWeakrefWhereTheClassIntroducesThem
	"object >> ___grailIntroducesInstanceSlot___: and the built-in table in
	___grailProvidesInstanceSlot___:."

	self assertAll: #('plain_class_entries' 'subclass_inherits_the_storage'
		'slots_leave_both_out' 'slots_naming_dict' 'int_has_no_weakref'
		'list_has_both' 'exception_already_has_dict' 'ordereddict_has_both_already'
		'type_class_has_both')
%

category: 'Grail-Tests'
method: ClassDictEntriesTestCase
testTheGetsetDescriptor
	"types.GetSetDescriptorType, one per class and name (___grailGetSetDescriptor___:)."

	self assertAll: #('getset_type' 'getset_repr' 'getset_attrs' 'getset_reads_vars'
		'getset_on_the_class_is_itself' 'weakref_reads_none_without_references'
		'the_same_object_each_time' 'is_a_data_descriptor')
%
