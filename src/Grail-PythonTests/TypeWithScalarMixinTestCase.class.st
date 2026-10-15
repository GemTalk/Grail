Class {
	#name : 'TypeWithScalarMixinTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
TypeWithScalarMixinTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
TypeWithScalarMixinTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'type_with_scalar_mixin' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/type_with_scalar_mixin.py')
		name: 'type_with_scalar_mixin'.

]

{ #category : 'Grail-Tests - construction' }
TypeWithScalarMixinTestCase >> testAScalarMixinConstructs [
	"It ended the session: ``7 new'', a Smalltalk MessageNotUnderstood that no
	Python except can see."

	self assertMatchesCPythonAt: 'construct_with_value'.
	self assertMatchesCPythonAt: 'construct_empty'.
	self assertMatchesCPythonAt: 'construct_single_base'.
	self assertMatchesCPythonAt: 'type_of_instance'.
	self assertMatchesCPythonAt: 'equals_its_value'.

]

{ #category : 'Grail-Tests - to_bytes' }
TypeWithScalarMixinTestCase >> testASubclassReachesItAtEveryArity [
	"The forwarding probe asked for the UNARY selector only, so every
	no-argument method forwarded and every other raised AttributeError for a
	method sitting right there.  A suite half of which forwards is worse than
	one that does not."

	self assertMatchesCPythonAt: 'to_bytes_on_mixin'.
	self assertMatchesCPythonAt: 'to_bytes_on_statement_sub'.

]

{ #category : 'Grail-Tests - __base__' }
TypeWithScalarMixinTestCase >> testBaseIsTheSolidBaseNotTheSubstitute [
	"``D.__base__ is int'' was False while its repr read ``<class 'int'>'':
	the Smalltalk superclass is AbstractPyInt, whose Python name is ``int''
	and which is not int.  __bases__ and __mro__ already hid the roots, so
	the three disagreed about the same class."

	self assertMatchesCPythonAt: 'base_of_mixin'.
	self assertMatchesCPythonAt: 'base_of_int_subclass'.
	self assertMatchesCPythonAt: 'base_of_str_subclass'.
	self assertMatchesCPythonAt: 'bases_tuple'.

]

{ #category : 'Grail-Tests - Controls' }
TypeWithScalarMixinTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '29 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - construction' }
TypeWithScalarMixinTestCase >> testItKeepsEveryBasesMethods [
	"Its own, the merged secondary base's, and the scalar root's."

	self assertMatchesCPythonAt: 'own_method'.
	self assertMatchesCPythonAt: 'merged_base_method'.
	self assertMatchesCPythonAt: 'scalar_method'.

]

{ #category : 'Grail-Tests - __dict__' }
TypeWithScalarMixinTestCase >> testTheDictHoldsOnlyWhatTheClassOwns [
	"A merged secondary base's method is compiled ONTO the class, so the
	method dictionary alone cannot tell it from the class's own -- the merge's
	own category can.  And Grail's internal names leaked because the method
	walks excluded them and the attribute holder did not."

	self assertMatchesCPythonAt: 'own_name_in_dict'.
	self assertMatchesCPythonAt: 'merged_name_not_in_dict'.
	self assertMatchesCPythonAt: 'no_internal_names'.
	self assertMatchesCPythonAt: 'firstlineno_absent'.

]

{ #category : 'Grail-Tests - Controls' }
TypeWithScalarMixinTestCase >> testTheOrdinaryShapesAreUnchanged [
	"A class STATEMENT subclass never took the broken construction path and
	must not start; a plain class's __dict__ and __base__ are untouched; and
	the unary methods that already forwarded still do."

	self assertMatchesCPythonAt: 'statement_subclass_value'.
	self assertMatchesCPythonAt: 'statement_subclass_unary'.
	self assertMatchesCPythonAt: 'str_subclass_value'.
	self assertMatchesCPythonAt: 'plain_class_dict'.
	self assertMatchesCPythonAt: 'plain_instance'.
	self assertMatchesCPythonAt: 'base_of_plain'.
	self assertMatchesCPythonAt: 'base_of_bare'.
	self assertMatchesCPythonAt: 'isinstance_of_int'.

]

{ #category : 'Grail-Tests - to_bytes' }
TypeWithScalarMixinTestCase >> testToBytesAnswersBytes [
	"It built a TUPLE of the byte values: the same numbers, the wrong type,
	and a wrong type that prints plausibly."

	self assertMatchesCPythonAt: 'to_bytes_plain'.
	self assertMatchesCPythonAt: 'to_bytes_big'.
	self assertMatchesCPythonAt: 'from_bytes_roundtrip'.

]
