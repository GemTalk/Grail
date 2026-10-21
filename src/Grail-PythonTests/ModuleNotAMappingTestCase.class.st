"A module is not a mapping, and its errors name its type, module.  Each test
reads tests/python/module_not_a_mapping.py, which measures the behaviour and
carries what CPython 3.14 answers."
Class {
	#name : 'ModuleNotAMappingTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'fixture'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ModuleNotAMappingTestCase >> assert: aKey answersAsIn: aTableName [

	| python |

	python := builtins @env1:instance.
	self
		assert: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #r) @env1:__getitem__: aKey)) asString
		equals: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: aTableName) @env1:__getitem__: aKey)) asString

]

{ #category : 'Grail-Private' }
ModuleNotAMappingTestCase >> assertAgreesWithCPythonAt: aKey [

	self assert: aKey answersAsIn: #EXPECTED

]

{ #category : 'Grail-Setup' }
ModuleNotAMappingTestCase >> setUp [

	(importlib @env1:modules) removeKey: #'module_not_a_mapping' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/module_not_a_mapping.py'
		name: 'module_not_a_mapping'

]

{ #category : 'Grail-Tests' }
ModuleNotAMappingTestCase >> testAKeyThatIsNotAStringRaisesACatchableTypeError [
	"collections.abc[int] was an uncatchable MessageNotUnderstood."

	self assertAgreesWithCPythonAt: 'a_non_string_key'.
	self assertAgreesWithCPythonAt: 'an_object_key'

]

{ #category : 'Grail-Tests' }
ModuleNotAMappingTestCase >> testAModuleHasNoContainerProtocol [

	#('imported_has_protocol' 'made_has_protocol' 'is_a_mapping') do: [:key |
		self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
ModuleNotAMappingTestCase >> testAStoreBySubscriptIsRefusedAndAddsNoAttribute [

	self assertAgreesWithCPythonAt: 'a_store_is_no_attribute'

]

{ #category : 'Grail-Tests' }
ModuleNotAMappingTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a deleted check would stop being
	asserted without anything going red.  This reads the fixture's own
	roll-up."

	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '14 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
ModuleNotAMappingTestCase >> testItsErrorsNameModule [
	"Messages named the Smalltalk class Grail mints per module: 'json'."

	#('calling_names_module' 'an_operand_names_module' 'a_comparison_names_module') do: [:key |
		self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
ModuleNotAMappingTestCase >> testItsNamespaceStillReads [

	self assertAgreesWithCPythonAt: 'the_namespace_still_reads'.
	self assertAgreesWithCPythonAt: 'a_module_is_true'

]

{ #category : 'Grail-Tests' }
ModuleNotAMappingTestCase >> testTheContainerOperationsRaiseCPythonsTypeErrors [
	"For an imported module, one made with types.ModuleType, and an instance of
	a ModuleType subclass, whose own name the messages carry."

	#('imported_operations' 'made_operations' 'subclassed_operations') do: [:key |
		self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
ModuleNotAMappingTestCase >> testTheDocumentedGrailGapIsUnchanged [
	"GRAIL_ONLY: module >> update: is still an attribute (#1727 keeps it).  When
	it goes this fails, and the key moves into EXPECTED."

	self assert: 'dict_methods' answersAsIn: #GRAIL_ONLY

]
