Class {
	#name : 'EnumBodyCallablesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
EnumBodyCallablesTestCase >> assertAll: names [

	| results |
	results := testModule @env1:___pyAttrLoad___: #RESULTS.
	names do: [:name | | result |
		result := results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Setup' }
EnumBodyCallablesTestCase >> setUp [

	importlib @env1:modules removeKey: #'enum_body_callables' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_body_callables.py')
		name: 'enum_body_callables'

]

{ #category : 'Grail-Tests' }
EnumBodyCallablesTestCase >> testAssignedCallableIsNotAMemberButABuiltinIs [
	"CPython _is_descriptor: a function, bound method, partial or lru_cache
	wrapper has __get__; a builtin does not."

	self assertAll: #('assigned_callables_are_not_members'
		'a_builtin_is_a_member')

]

{ #category : 'Grail-Tests' }
EnumBodyCallablesTestCase >> testDecoratedDefIsNotAMember [
	"A decorated def's result sits in the class-attribute holder, which the
	member build sweeps; Enum class >> ___grailIsBodyDescriptor: is what keeps
	it out."

	self assertAll: #('decorated_defs_are_not_members'
		'plain_decorated_def_is_callable'
		'wrapping_decorated_def_is_callable'
		'cache_decorated_def_is_callable')

]

{ #category : 'Grail-Tests' }
EnumBodyCallablesTestCase >> testMembersKeepDefinitionOrder [
	"The record's name map is a PyDict; @unique and verify(NAMED_FLAGS) walk it
	as CPython walks _member_map_."

	self assertAll: #('members_in_definition_order'
		'member_map_in_definition_order'
		'unique_lists_aliases_in_definition_order'
		'named_flags_lists_aliases_in_definition_order')

]

{ #category : 'Grail-Tests' }
EnumBodyCallablesTestCase >> testMetaclassNamespaceExcludesDefs [
	"EnumDict >> __setitem__ asks the same predicate."

	self assertAll: #('metaclass_member_names_exclude_defs'
		'metaclass_enum_members')

]

{ #category : 'Grail-Tests' }
EnumBodyCallablesTestCase >> testSetNameRunsInAnEnumBody [
	"Enum class >> ___grailBuildMembers:names: runs the __set_name__ walk the
	ordinary ___pyClassDefined___: would have."

	self assertAll: #('set_name_runs_in_an_enum_body'
		'assigned_cached_property'
		'decorated_cached_property'
		'descriptors_are_not_members')

]
