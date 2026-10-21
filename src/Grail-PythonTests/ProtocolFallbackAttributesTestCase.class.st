"A protocol method an object only has to raise TypeError is not an attribute
(#1632).  Each test reads tests/python/protocol_fallback_attributes.py, which
measures the behaviour and carries what CPython 3.14 answers."
Class {
	#name : 'ProtocolFallbackAttributesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'fixture'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ProtocolFallbackAttributesTestCase >> assert: aKey answersAsIn: aTableName [

	| python |

	python := builtins @env1:instance.
	self
		assert: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #r) @env1:__getitem__: aKey)) asString
		equals: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: aTableName) @env1:__getitem__: aKey)) asString

]

{ #category : 'Grail-Private' }
ProtocolFallbackAttributesTestCase >> assertAgreesWithCPythonAt: aKey [

	self assert: aKey answersAsIn: #EXPECTED

]

{ #category : 'Grail-Setup' }
ProtocolFallbackAttributesTestCase >> setUp [

	(importlib @env1:modules) removeKey: #'protocol_fallback_attributes' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/protocol_fallback_attributes.py'
		name: 'protocol_fallback_attributes'

]

{ #category : 'Grail-Tests' }
ProtocolFallbackAttributesTestCase >> testABuiltInHasOnlyTheProtocolsItsCPythonTypeHas [
	"int, float, None and the rest answered __iter__, __getitem__ and
	__contains__ from Grail's refusals and root fallbacks."

	#('int' 'float' 'complex' 'None' 'bool' 'object' 'int_subclass') do: [:key |
		self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
ProtocolFallbackAttributesTestCase >> testAClassHasTypesCallAndNoRefusal [
	"type's __call__ is an attribute of the class; object's refusals are not."

	self assertAgreesWithCPythonAt: 'plain_class'

]

{ #category : 'Grail-Tests' }
ProtocolFallbackAttributesTestCase >> testAPythonInstanceDoesNotReadPythonInstancesFallbacks [
	"Every Python instance answered PythonInstance's __iter__, __getitem__,
	__contains__ and __next__.  A class that defines one, or sets
	``__iter__ = None'', still has exactly that."

	#('plain_instance' 'subscriptable_instance' 'iter_set_to_none') do: [:key |
		self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
ProtocolFallbackAttributesTestCase >> testARealProtocolIsStillAnAttribute [

	#('str' 'list' 'dict' 'bytes') do: [:key | self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
ProtocolFallbackAttributesTestCase >> testARefusalStillRaisesItsTypeErrorWhenUsed [
	"What the refusals exist for: iter(1) must still fail as CPython's does."

	#('iter_int_still_raises' 'subscript_int_still_raises' 'len_none_still_raises'
		'contains_int_still_raises') do: [:key | self assertAgreesWithCPythonAt: key]

]

{ #category : 'Grail-Tests' }
ProtocolFallbackAttributesTestCase >> testDuckTypedIterabilityTakesTheScalarBranch [
	"requests' _encode_params, the shape that found it."

	self assertAgreesWithCPythonAt: 'encode_params_int'.
	self assertAgreesWithCPythonAt: 'encode_params_list'

]

{ #category : 'Grail-Tests' }
ProtocolFallbackAttributesTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a deleted check would stop being
	asserted without anything going red.  This reads the fixture's own
	roll-up."

	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '23 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
ProtocolFallbackAttributesTestCase >> testGettingAFallbackRaisesAttributeError [

	self assertAgreesWithCPythonAt: 'getattr_int_iter'.
	self assertAgreesWithCPythonAt: 'getattr_none_len'

]

{ #category : 'Grail-Tests' }
ProtocolFallbackAttributesTestCase >> testTheDocumentedGrailGapIsUnchanged [
	"GRAIL_ONLY: a builtin function keeps BoundMethod's real __getitem__.  When
	that is fixed this fails, and the key moves into EXPECTED, as
	``plain_class'' did."

	self assert: 'builtin_function' answersAsIn: #GRAIL_ONLY

]
