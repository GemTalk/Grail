Class {
	#name : 'PydanticPhase6WallsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
PydanticPhase6WallsTestCase >> ___assertEveryCheckIn___: aModule label: aString [
	| results bad |
	results := aModule @env1:___pyAttrLoad___: #RESULTS.
	bad := OrderedCollection new.
	self ___names___ do: [:name |
		| v |
		v := results @env1:__getitem__: name.
		v = true ifFalse: [bad add: name , ' -> ' , v printString]].
	self assert: bad isEmpty
		description: aString , ': ' , bad asArray printString.
	self assert: (results @env1:__len__) equals: self ___names___ size

]

{ #category : 'Grail-Private' }
PydanticPhase6WallsTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/pydantic_phase6_walls.py'

]

{ #category : 'Grail-Private' }
PydanticPhase6WallsTestCase >> ___irModule___ [
	"Forced rather than inherited, so both codegen paths are covered."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'pp6w_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'pp6w_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'pp6w_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
PydanticPhase6WallsTestCase >> ___names___ [
	"Listed rather than iterated so that a check DISAPPEARING fails too."

	^ #('annotations_cleared_in_place_class_body'
	    'annotations_cleared_in_place_direct'
	    'colorsys_hls_roundtrip'
	    'colorsys_rgb_to_hsv'
	    'conditional_bool'
	    'conditional_call'
	    'conditional_contains'
	    'conditional_delattr'
	    'conditional_getitem'
	    'conditional_hash'
	    'conditional_iter'
	    'conditional_len'
	    'conditional_setattr'
	    'conditional_setattr_inherited'
	    'deepcopy_instance_dict'
	    'deepcopy_instance_dict_is_deep'
	    'dict_assignment_from_another_instance'
	    'dict_self_assignment_keeps_attributes'
	    'inherited_classmethod_func_identity'
	    'int_enum_has_missing'
	    'lambda_signature_default'
	    'lambda_signature_nested_kwonly'
	    'lambda_signature_one'
	    'lambda_signature_star'
	    'namespace_bind_runs_no_metaclass_property'
	    'namespace_holds_classmethod'
	    'namespace_holds_data'
	    'namespace_holds_function'
	    'namespace_holds_property'
	    'namespace_holds_staticmethod'
	    'star_import_honours_all'
	    'str_enum_has_missing'
	    'super_new_with_class_keywords'
	    'uuid3'
	    'uuid4_differs'
	    'uuid4_version'
	    'uuid5'
	    'uuid_bytes_roundtrip'
	    'uuid_fields'
	    'uuid_int_roundtrip'
	    'warn_runs_category_init')

]

{ #category : 'Grail-Setup' }
PydanticPhase6WallsTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'pp6w_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'pydantic_phase6_walls' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'pp6w_ir'.
	irModule := nil

]

{ #category : 'Grail-Tests - pydantic walls' }
PydanticPhase6WallsTestCase >> testEveryCheckAgreesWithCPython [
	| fixture |
	(importlib @env1:modules) removeKey: #'pydantic_phase6_walls' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'pydantic_phase6_walls'.
	self ___assertEveryCheckIn___: fixture label: 'default path'

]

{ #category : 'Grail-Tests - pydantic walls' }
PydanticPhase6WallsTestCase >> testEveryCheckAgreesWithCPythonUnderIR [
	self ___assertEveryCheckIn___: self ___irModule___ label: 'forced IR'

]

{ #category : 'Grail-Tests - pydantic walls' }
PydanticPhase6WallsTestCase >> testTheIRArmActuallyCompiledTheFixture [
	"A guard on the guard: correct answers under IR prove nothing if every def
	fell back to text."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #compiled) > 0
		description: 'IR compiled nothing: ' , stats printString

]
