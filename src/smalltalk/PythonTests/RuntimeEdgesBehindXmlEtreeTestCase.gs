! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'RuntimeEdgesBehindXmlEtreeTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
RuntimeEdgesBehindXmlEtreeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! RuntimeEdgesBehindXmlEtreeTestCase - the object-model gaps test.test_xml_etree
! exercised.  Drives tests/python/runtime_edges_behind_xml_etree.py, which is
! self-running: check_python_fixtures.sh measures every check against CPython.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
RuntimeEdgesBehindXmlEtreeTestCase removeAllMethods.
RuntimeEdgesBehindXmlEtreeTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Private'
method: RuntimeEdgesBehindXmlEtreeTestCase
assertFixtureChecks: keys
	| mod results |
	importlib @env1:modules removeKey: #'runtime_edges_behind_xml_etree' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/runtime_edges_behind_xml_etree.py')
		name: 'runtime_edges_behind_xml_etree'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	keys do: [:key |
		self assert: ((results @env1:__getitem__: key) = true) description: key]
%

category: 'Grail-Tests - Binding'
method: RuntimeEdgesBehindXmlEtreeTestCase
testABoundMethodInAClassIsNotRebound
	"``class It: __next__ = gen.__next__'' -- ElementTree's iterparse.  A bound
	method is not a descriptor; the class attribute must reach next() as it
	was bound (object >> ___isDescriptorCallable___:, and the shadow forwarder
	installed for an already-bound callable)."

	self assertFixtureChecks: #('bound_method_class_attr_not_rebound'
		'bound_builtin_method_class_attr')
%

category: 'Grail-Tests - Sequences'
method: RuntimeEdgesBehindXmlEtreeTestCase
testMutationDuringSequenceOperations
	"A slice's __index__ runs before the length is read (it may empty the
	list), list.remove survives an __eq__ that clears the list, and a
	subclass's slice is its builtin's type."

	self assertFixtureChecks: #('mutating_slice_index' 'list_remove_shrunk_by_eq'
		'subclass_slice_types' 'explicit_object_eq')
%

category: 'Grail-Tests - Instance Dict'
method: RuntimeEdgesBehindXmlEtreeTestCase
testTheInstanceDictIsLive
	"__dict__ answers live dict views whose iteration notices growth,
	__getstate__ answers the dict itself, and deepcopy walks it live."

	self assertFixtureChecks: #('instance_dict_iteration_detects_growth'
		'instance_dict_views' 'getstate_is_the_dict' 'deepcopy_sees_mutation'
		'module_dir_is_a_list')
%

category: 'Grail-Tests - Classes'
method: RuntimeEdgesBehindXmlEtreeTestCase
testMultipleInheritanceOntoAnExceptionBase
	"A secondary base's methods copied onto a class built on ValueError, whose
	chain has AbstractException's ``tag'' instVar; and sequence iteration on a
	class that did not derive from PythonInstance."

	self assertFixtureChecks: #('mi_exception_base_method_copy'
		'mi_exception_base_sequence_iter')
%

category: 'Grail-Tests - Misc'
method: RuntimeEdgesBehindXmlEtreeTestCase
testGeneratorAndUrljoin

	self assertFixtureChecks: #('closed_unstarted_generator' 'urljoin_rfc3986')
%
