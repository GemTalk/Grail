Class {
	#name : 'ClassBodyRebindingAndInstanceDictTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassBodyRebindingAndInstanceDictTestCase >> ___assertEveryCheckIn___: aModule label: aString [
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
ClassBodyRebindingAndInstanceDictTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/class_body_rebinding_and_instance_dict.py'

]

{ #category : 'Grail-Private' }
ClassBodyRebindingAndInstanceDictTestCase >> ___irModule___ [
	"Forced rather than inherited, so both codegen paths are covered."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'cbraid_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbraid_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'cbraid_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
ClassBodyRebindingAndInstanceDictTestCase >> ___names___ [
	"Listed rather than iterated so that a check DISAPPEARING fails too."

	^ #('bare_overload_keyword_reaches_impl'
	    'bare_overload_one_arg_reaches_impl'
	    'class_body_dunder_init_attribute'
	    'class_body_function_attribute'
	    'class_body_function_attribute_via_instance'
	    'dict_assignment_reads_back'
	    'dict_assignment_replaces_old_attributes'
	    'dict_assignment_requires_a_dict'
	    'dict_assignment_sets_attributes'
	    'instance_dict_copy_is_independent'
	    'instance_dict_copy_method'
	    'instance_dict_copy_module'
	    'later_decorated_def_still_applies'
	    'later_plain_def_beats_earlier_decorated'
	    'later_plain_def_beats_earlier_plain')

]

{ #category : 'Grail-Setup' }
ClassBodyRebindingAndInstanceDictTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'cbraid_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'class_body_rebinding_and_instance_dict' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'cbraid_ir'.
	irModule := nil

]

{ #category : 'Grail-Tests - class body' }
ClassBodyRebindingAndInstanceDictTestCase >> testEveryCheckAgreesWithCPython [
	| fixture |
	(importlib @env1:modules) removeKey: #'class_body_rebinding_and_instance_dict' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: self ___fixturePath___
		name: 'class_body_rebinding_and_instance_dict'.
	self ___assertEveryCheckIn___: fixture label: 'default path'

]

{ #category : 'Grail-Tests - class body' }
ClassBodyRebindingAndInstanceDictTestCase >> testEveryCheckAgreesWithCPythonUnderIR [
	self ___assertEveryCheckIn___: self ___irModule___ label: 'forced IR'

]

{ #category : 'Grail-Tests - class body' }
ClassBodyRebindingAndInstanceDictTestCase >> testTheIRArmActuallyCompiledTheFixture [
	"A guard on the guard: correct answers under IR prove nothing if every def
	fell back to text."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #compiled) > 0
		description: 'IR compiled nothing: ' , stats printString

]
