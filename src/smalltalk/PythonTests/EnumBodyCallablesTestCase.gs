! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumBodyCallablesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumBodyCallablesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumBodyCallablesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumBodyCallablesTestCase - what an enum class body makes a member
! ===============================================================================
! tests/python/enum_body_callables.py holds the checks, each measured against
! CPython 3.14.6 and run there by scripts/check_python_fixtures.sh.  One test
! per mechanism, so a regression names the layer it came from.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumBodyCallablesTestCase removeAllMethods.
EnumBodyCallablesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumBodyCallablesTestCase
setUp

	importlib @env1:modules removeKey: #'enum_body_callables' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_body_callables.py')
		name: 'enum_body_callables'
%

category: 'Grail-Helpers'
method: EnumBodyCallablesTestCase
assertAll: names

	| results |
	results := testModule @env1:___pyAttrLoad___: #RESULTS.
	names do: [:name | | result |
		result := results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests'
method: EnumBodyCallablesTestCase
testDecoratedDefIsNotAMember
	"A decorated def's result sits in the class-attribute holder, which the
	member build sweeps; Enum class >> ___grailIsBodyDescriptor: is what keeps
	it out."

	self assertAll: #('decorated_defs_are_not_members'
		'plain_decorated_def_is_callable'
		'wrapping_decorated_def_is_callable'
		'cache_decorated_def_is_callable')
%

category: 'Grail-Tests'
method: EnumBodyCallablesTestCase
testAssignedCallableIsNotAMemberButABuiltinIs
	"CPython _is_descriptor: a function, bound method, partial or lru_cache
	wrapper has __get__; a builtin does not."

	self assertAll: #('assigned_callables_are_not_members'
		'a_builtin_is_a_member')
%

category: 'Grail-Tests'
method: EnumBodyCallablesTestCase
testMetaclassNamespaceExcludesDefs
	"EnumDict >> __setitem__ asks the same predicate."

	self assertAll: #('metaclass_member_names_exclude_defs'
		'metaclass_enum_members')
%

category: 'Grail-Tests'
method: EnumBodyCallablesTestCase
testSetNameRunsInAnEnumBody
	"Enum class >> ___grailBuildMembers:names: runs the __set_name__ walk the
	ordinary ___pyClassDefined___: would have."

	self assertAll: #('set_name_runs_in_an_enum_body'
		'assigned_cached_property'
		'decorated_cached_property'
		'descriptors_are_not_members')
%

category: 'Grail-Tests'
method: EnumBodyCallablesTestCase
testMembersKeepDefinitionOrder
	"The record's name map is a PyDict; @unique and verify(NAMED_FLAGS) walk it
	as CPython walks _member_map_."

	self assertAll: #('members_in_definition_order'
		'member_map_in_definition_order'
		'unique_lists_aliases_in_definition_order'
		'named_flags_lists_aliases_in_definition_order')
%
