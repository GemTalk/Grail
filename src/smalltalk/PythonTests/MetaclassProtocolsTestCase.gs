! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MetaclassProtocolsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MetaclassProtocolsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MetaclassProtocolsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MetaclassProtocolsTestCase - the class-construction protocols typing needs
! ===============================================================================
! typing.py is CPython's own now, NamedTuple and TypedDict included: type.__new__
! builds the class a metaclass asks for when it passes different bases, a
! metaclass can be called directly and have an assigned __call__, a class
! inherits the most derived metaclass among ALL its bases, and class-level
! reads follow the MRO.  The refusals CPython's C types make are here too.
!
! tests/python/metaclass_protocols.py holds the checks, run under real CPython 3.14
! by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MetaclassProtocolsTestCase removeAllMethods.
MetaclassProtocolsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: MetaclassProtocolsTestCase
setUp

	importlib @env1:modules removeKey: #'metaclass_protocols' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/metaclass_protocols.py')
		name: 'metaclass_protocols'
%

category: 'Grail-Helpers'
method: MetaclassProtocolsTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: MetaclassProtocolsTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests'
method: MetaclassProtocolsTestCase
testCallingAMetaclass

	self assertAll: #('a_metaclass_call_builds_a_class'
		'a_metaclass_call_refuses_the_wrong_arity'
		'an_assigned_metaclass_call_is_not_bound')
%

category: 'Grail-Tests'
method: MetaclassProtocolsTestCase
testAMetaclassMayRewriteTheBases

	self assertAll: #('type_new_builds_the_bases_the_metaclass_passes'
		'a_typeddict_is_a_dict_subclass'
		'a_generic_typeddict_through_its_second_base'
		'a_namedtuple_is_a_tuple_subclass'
		'a_namedtuple_method_calls_its_sibling')
%

category: 'Grail-Tests'
method: MetaclassProtocolsTestCase
testTheNamespaceAMetaclassIsHanded

	self assertAll: #('the_namespace_starts_with_module_and_qualname')
%

category: 'Grail-Tests'
method: MetaclassProtocolsTestCase
testTheMetaclassComesFromEveryBase

	self assertAll: #('a_second_base_supplies_the_metaclass'
		'a_builtin_base_implements_the_abstract_methods'
		'super_instancecheck_from_a_metaclass')
%

category: 'Grail-Tests'
method: MetaclassProtocolsTestCase
testClassReadsFollowTheMro

	self assertAll: #('an_inherited_method_is_the_same_object'
		'a_subclass_def_beats_a_base_assignment'
		'a_protocol_refuses_and_a_subclass_constructs'
		'pprint_keeps_dict_and_defaultdict_apart')
%

category: 'Grail-Tests'
method: MetaclassProtocolsTestCase
testCPythonsRefusals

	self assertAll: #('typing_types_refuse_subclassing'
		'pattern_aliases_are_named_after_re'
		'a_function_type_is_callable')
%

category: 'Grail-Tests'
method: MetaclassProtocolsTestCase
testEveryFixtureCheckIsAsserted
	"The six tests above name 19 checks, one per check the fixture makes; a
	check added there without a test here changes the count."

	self assert: (self results @env1:__len__) equals: 19
%
