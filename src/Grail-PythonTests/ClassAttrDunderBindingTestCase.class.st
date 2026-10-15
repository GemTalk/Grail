Class {
	#name : 'ClassAttrDunderBindingTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassAttrDunderBindingTestCase >> assertKind: aKind matchesCPythonIn: aModule [
	| bad |
	bad := (aModule @env1:___pyAttrLoad___: #mismatches)
		@env1:___pyCallValue___: { aKind } kw: nil.
	self
		assert: (bad @env1:__len__) = 0
		description: aKind , ': ' , (builtins @env1:instance @env1:repr: bad) asString

]

{ #category : 'Grail-Private' }
ClassAttrDunderBindingTestCase >> assertKindMatchesCPython: aKind [
	"Every case of aKind agrees with CPython; the failure lists the ones that
	do not, with both answers."

	self assertKind: aKind matchesCPythonIn: testModule

]

{ #category : 'Grail-Setup' }
ClassAttrDunderBindingTestCase >> fixtureNamed: aName [
	"The fixture module tests/python/<aName>.py, imported once per session.
	A fresh import replaces any earlier one of that name, so a session that
	imported it some other way still gets this one."

	| key |
	key := ('GrailClassAttrDunderFixture_' , aName) asSymbol.
	^ SessionTemps current at: key ifAbsent: [ | m |
		(importlib @env1:modules) removeKey: aName asSymbol ifAbsent: [].
		m := importlib
			loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
			name: aName.
		SessionTemps current at: key put: m.
		m]

]

{ #category : 'Grail-Setup' }
ClassAttrDunderBindingTestCase >> setUp [
	testModule := self fixtureNamed: 'class_attr_dunder_binding'

]

{ #category : 'Grail-Setup' }
ClassAttrDunderBindingTestCase >> tearDown [
	testModule := nil

]

{ #category : 'Grail-Tests' }
ClassAttrDunderBindingTestCase >> testBoundMethodIsNotBoundAgain [
	"``__len__ = lst.__len__'', ``__next__ = gen.__next__'': already bound,
	not a descriptor, called with the arguments alone."

	self assertKindMatchesCPython: 'bound'

]

{ #category : 'Grail-Tests' }
ClassAttrDunderBindingTestCase >> testCallableInstanceIsNotBound [
	self assertKindMatchesCPython: 'callobj'

]

{ #category : 'Grail-Tests' }
ClassAttrDunderBindingTestCase >> testClassmethodBindsTheClass [
	self assertKindMatchesCPython: 'classm'

]

{ #category : 'Grail-Tests' }
ClassAttrDunderBindingTestCase >> testEveryCaseRan [
	"The table is the CPython run's: as many results as expectations, and
	enough of them that a generator change cannot empty the test quietly."

	| results expected |
	results := testModule @env1:___pyAttrLoad___: #RESULTS.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 383.
	self assert: (results @env1:__len__) = (expected @env1:__len__)

]

{ #category : 'Grail-Tests' }
ClassAttrDunderBindingTestCase >> testFunctionsBindTheInstance [
	"A def, a lambda, and a function read off another class (Grail's
	UnboundMethod) all bind: the instance comes first."

	self assertKindMatchesCPython: 'func'.
	self assertKindMatchesCPython: 'lambda'.
	self assertKindMatchesCPython: 'plainfn'

]

{ #category : 'Grail-Tests' }
ClassAttrDunderBindingTestCase >> testInstanceAttributesAreNotTheProtocol [
	"The other half of the type lookup these tests pin: a protocol dunder
	stored on an INSTANCE is ignored by len(), bool(), -o, abs(), bytes() and
	the rest, and loses to one the class defines, while an explicit
	``o.__len__()'' still finds it (#1481).

	See tests/python/instance_dunder_ignored.py (CPython 3.14's values)."

	| mod results expected b keys |
	mod := self fixtureNamed: 'instance_dunder_ignored'.
	results := mod @env1:___pyAttrLoad___: #'r'.
	expected := mod @env1:___pyAttrLoad___: #'EXPECTED'.
	keys := mod @env1:___pyAttrLoad___: #'KEYS'.
	b := builtins @env1:instance.
	self assert: (keys @env1:__len__) equals: 20.
	self assert: (results @env1:__len__) equals: 20.
	0 to: (keys @env1:__len__) - 1 do: [:i |
		| k got want |
		k := keys @env1:__getitem__: i.
		got := (b @env1:repr: (results @env1:__getitem__: k)) asString.
		want := (b @env1:repr: (expected @env1:__getitem__: k)) asString.
		self assert: got equals: want
			description: k asString , ': got ' , got , ' want ' , want]

]

{ #category : 'Grail-Tests' }
ClassAttrDunderBindingTestCase >> testIterparse [
	"The issue's end-to-end case: CPython 3.14's ElementTree.iterparse builds
	its iterator class with ``__next__ = gen.__next__''."

	self assertKindMatchesCPython: 'ET.iterparse'

]

{ #category : 'Grail-Tests' }
ClassAttrDunderBindingTestCase >> testObjectDefaultIsNotAnOverride [
	"``__str__ = object.__str__'' names the default, which is the very method
	that looks the attribute up: called as an override it re-entered itself
	until the stack ran out (test_enum's test_object_str_override)."

	self assertKindMatchesCPython: 'object.default'

]

{ #category : 'Grail-Tests' }
ClassAttrDunderBindingTestCase >> testStaticmethodTakesTheArgumentsAlone [
	self assertKindMatchesCPython: 'static'

]

{ #category : 'Grail-Tests' }
ClassAttrDunderBindingTestCase >> testTypeBuiltClasses [
	"``type('T', (), {'__len__': f})'' and ``type('U', (Base,), {...})'':
	every value kind, on one protocol per lookup path.  On main before #1396
	merged, 304 of a full 378-case run of these disagreed with CPython."

	| m expected |
	m := self fixtureNamed: 'type_built_class_dunders'.
	expected := m @env1:___pyAttrLoad___: #EXPECTED.
	self assert: (expected @env1:__len__) >= 168.
	self assert: ((m @env1:___pyAttrLoad___: #RESULTS) @env1:__len__) = (expected @env1:__len__).
	#('func' 'lambda' 'plainfn' 'classm' 'static' 'bound' 'callobj') do: [:k |
		self assertKind: k matchesCPythonIn: m]

]
