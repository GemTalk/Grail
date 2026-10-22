"An operator a module does not support raises CPython's TypeError.  Each test
reads tests/python/module_operators.py, which measures the behaviour and
carries what CPython 3.14 answers."
Class {
	#name : 'ModuleOperatorsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'fixture'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ModuleOperatorsTestCase >> assertAgreesWithCPythonAt: aKey [

	| python |

	python := builtins @env1:instance.
	self
		assert: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #r) @env1:__getitem__: aKey)) asString
		equals: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: aKey)) asString

]

{ #category : 'Grail-Setup' }
ModuleOperatorsTestCase >> setUp [

	(importlib @env1:modules) removeKey: #'module_operators' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/module_operators.py'
		name: 'module_operators'

]

{ #category : 'Grail-Tests' }
ModuleOperatorsTestCase >> testAModuleHasNoOperatorMethods [

	self assertAgreesWithCPythonAt: 'has_the_methods'

]

{ #category : 'Grail-Tests' }
ModuleOperatorsTestCase >> testAModuleSubclassKeepsItsOwnOperator [

	self assertAgreesWithCPythonAt: 'a_subclass_defines_neg'.
	self assertAgreesWithCPythonAt: 'a_subclass_lacks_abs'

]

{ #category : 'Grail-Tests' }
ModuleOperatorsTestCase >> testAnUnsupportedOperatorRaisesCPythonsTypeError [
	"-mod, +mod, ~mod and abs(mod) answered a raw Smalltalk nil; reversed(mod)
	iterated the kernel dictionary's slots."

	self assertAgreesWithCPythonAt: 'imported_operators'.
	self assertAgreesWithCPythonAt: 'made_operators'

]

{ #category : 'Grail-Tests' }
ModuleOperatorsTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a deleted check would stop being
	asserted without anything going red.  This reads the fixture's own
	roll-up."

	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
ModuleOperatorsTestCase >> testItsAttributesStillRead [

	self assertAgreesWithCPythonAt: 'attributes_still_read'.
	self assertAgreesWithCPythonAt: 'a_missing_attribute'

]
