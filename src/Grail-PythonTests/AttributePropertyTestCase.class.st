Class {
	#name : 'AttributePropertyTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
AttributePropertyTestCase >> setUp [
	"Reload tests/python/attribute_property.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'attribute_property' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/attribute_property.py')
		name: 'attribute_property'.

]

{ #category : 'Grail-Tests - Getter' }
AttributePropertyTestCase >> testCelsiusGetterReturnsStored [
	"@property celsius getter returns the underlying _celsius slot."

	self assert: (testModule @env1:___pyAttrLoad___: #celsius_init) equals: 100.

]

{ #category : 'Grail-Tests - Setter' }
AttributePropertyTestCase >> testCelsiusSetterWritesInternalSlot [
	"@celsius.setter writes through to _celsius."

	self assert: (testModule @env1:___pyAttrLoad___: #celsius_first) equals: 100.
	self assert: (testModule @env1:___pyAttrLoad___: #fahrenheit_first) equals: 212.

]

{ #category : 'Grail-Tests - Getter' }
AttributePropertyTestCase >> testFahrenheitGetterComputes [
	"@property fahrenheit getter computes from _celsius."

	self assert: (testModule @env1:___pyAttrLoad___: #fahrenheit_read) equals: 212.

]

{ #category : 'Grail-Tests - Setter' }
AttributePropertyTestCase >> testFahrenheitOverwriteUpdatesCelsius [
	"fahrenheit = 32 after celsius = 100 rewrites _celsius to 0.0."

	self assert: (testModule @env1:___pyAttrLoad___: #celsius_second) equals: 0.
	self assert: (testModule @env1:___pyAttrLoad___: #fahrenheit_second) equals: 32.

]

{ #category : 'Grail-Tests - Setter' }
AttributePropertyTestCase >> testFahrenheitRoundTripsAfterSet [
	"After fahrenheit = 32, reading fahrenheit yields 32.0."

	self assert: (testModule @env1:___pyAttrLoad___: #fahrenheit_after_freezing) equals: 32.

]

{ #category : 'Grail-Tests - Setter' }
AttributePropertyTestCase >> testFahrenheitSetterConvertsToInternalSlot [
	"@fahrenheit.setter converts F→C and writes _celsius."

	self assert: (testModule @env1:___pyAttrLoad___: #celsius_after_freezing) equals: 0.

]

{ #category : 'Grail-Tests - Internal Slot' }
AttributePropertyTestCase >> testPrivateSlotMatchesPublicGetter [
	"The internal _celsius slot stays in sync with the public
	celsius property getter (no separate copy)."

	self assert: (testModule @env1:___pyAttrLoad___: #private_value) equals: 25.
	self assert: (testModule @env1:___pyAttrLoad___: #public_value) equals: 25.

]
