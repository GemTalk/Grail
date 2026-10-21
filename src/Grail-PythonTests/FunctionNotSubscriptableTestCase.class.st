"No function or method subscripts, and weakref.ref is a class.  Each test
reads tests/python/function_not_subscriptable.py, which measures the behaviour
and carries what CPython 3.14 answers."
Class {
	#name : 'FunctionNotSubscriptableTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'fixture'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
FunctionNotSubscriptableTestCase >> assertAgreesWithCPythonAt: aKey [

	| python |

	python := builtins @env1:instance.
	self
		assert: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #r) @env1:__getitem__: aKey)) asString
		equals: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: aKey)) asString

]

{ #category : 'Grail-Setup' }
FunctionNotSubscriptableTestCase >> setUp [

	(importlib @env1:modules) removeKey: #'function_not_subscriptable' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/function_not_subscriptable.py'
		name: 'function_not_subscriptable'

]

{ #category : 'Grail-Tests' }
FunctionNotSubscriptableTestCase >> testAFunctionHasNoGetitem [

	#('builtin_has_getitem' 'def_has_getitem' 'method_has_getitem') do: [:key |
		self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
FunctionNotSubscriptableTestCase >> testAFunctionSubscriptRaisesTypeError [

	#('builtin_subscript' 'def_subscript' 'method_subscript') do: [:key |
		self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
FunctionNotSubscriptableTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a deleted check would stop being
	asserted without anything going red.  This reads the fixture's own
	roll-up."

	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '15 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
FunctionNotSubscriptableTestCase >> testGenericAliasesStillSubscript [
	"list[int], dict[str, int], type[int] and weakref.ref[int]: the last was
	answered by the function pass-through this replaces."

	self assertAgreesWithCPythonAt: 'generic_aliases_still_subscript'

]

{ #category : 'Grail-Tests' }
FunctionNotSubscriptableTestCase >> testIsinstanceAgainstWeakrefRefTellsAWeakReceiver [
	"blinker's receivers_for: isinstance(r, weakref.ref) raised TypeError."

	self assertAgreesWithCPythonAt: 'isinstance_ref'.
	self assertAgreesWithCPythonAt: 'receivers_for'

]

{ #category : 'Grail-Tests' }
FunctionNotSubscriptableTestCase >> testWeakrefRefIsTheReferenceClass [

	#('ref_is_reference_type' 'ref_is_a_class' 'ref_subclass') do: [:key |
		self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
FunctionNotSubscriptableTestCase >> testWeakrefRefStillMakesAReference [

	#('ref_dereferences' 'ref_with_none_callback' 'ref_with_callback') do: [:key |
		self assertAgreesWithCPythonAt: key]

]
