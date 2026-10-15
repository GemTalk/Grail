Class {
	#name : 'AttributeProtocolTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
AttributeProtocolTestCase >> setUp [
	"Reload tests/python/attribute_protocol.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'attribute_protocol' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/attribute_protocol.py')
		name: 'attribute_protocol'.

]

{ #category : 'Grail-Tests - setattr override' }
AttributeProtocolTestCase >> testCelsiusSetThenRead [
	"Direct .celsius = 100 store routes through __setattr__'s else
	branch and lands in the dict."

	self assert: (testModule @env1:___pyAttrLoad___: #celsius_first) equals: 100.

]

{ #category : 'Grail-Tests - setattr override' }
AttributeProtocolTestCase >> testFahrenheitDerivedAfterCelsiusSet [
	"After celsius = 100, fahrenheit reads 212.0 via __getattr__."

	self assert: (testModule @env1:___pyAttrLoad___: #fahrenheit_first) equals: 212.

]

{ #category : 'Grail-Tests - setattr override' }
AttributeProtocolTestCase >> testFahrenheitOverwriteUpdatesCelsius [
	"Setting fahrenheit = 32 after celsius was 100 overwrites celsius to 0.0."

	self assert: (testModule @env1:___pyAttrLoad___: #celsius_second) equals: 0.
	self assert: (testModule @env1:___pyAttrLoad___: #fahrenheit_second) equals: 32.

]

{ #category : 'Grail-Tests - setattr override' }
AttributeProtocolTestCase >> testFahrenheitRoundTripsAfterSet [
	"After setting fahrenheit = 32, reading fahrenheit back yields 32.0."

	self assert: (testModule @env1:___pyAttrLoad___: #fahrenheit_after_freezing)
		equals: 32.

]

{ #category : 'Grail-Tests - getattr override' }
AttributeProtocolTestCase >> testGetattrComputesFahrenheit [
	"Reading t.fahrenheit on a Thermometer with celsius=100 falls
	through to __getattr__ (no 'fahrenheit' slot exists), which
	computes 100 * 9/5 + 32 = 212.0."

	self assert: (testModule @env1:___pyAttrLoad___: #fahrenheit_read) equals: 212.

]

{ #category : 'Grail-Tests - getattr override' }
AttributeProtocolTestCase >> testGetattrRaisesForMissingName [
	"__getattr__ on a name other than 'fahrenheit' must raise
	AttributeError per the user definition."

	self assert: (testModule @env1:___pyAttrLoad___: #missing_attr)
		equals: 'attribute_error'.

]

{ #category : 'Grail-Tests - getattr override' }
AttributeProtocolTestCase >> testInitStoresCelsius [
	"Constructing Thermometer(100) goes through __setattr__('celsius', 100)
	which delegates to object.__setattr__ — celsius lands in the dict."

	self assert: (testModule @env1:___pyAttrLoad___: #celsius_init) equals: 100.

]

{ #category : 'Grail-Tests - setattr override' }
AttributeProtocolTestCase >> testSetattrConvertsFahrenheitToCelsius [
	"Setting t.fahrenheit = 32 must call __setattr__, which converts
	32°F to 0°C and stores celsius via object.__setattr__."

	self assert: (testModule @env1:___pyAttrLoad___: #celsius_after_freezing)
		equals: 0.

]

{ #category : 'Grail-Tests - setattr override' }
AttributeProtocolTestCase >> testSetattrElseBranchStoresArbitraryName [
	"Setting t.label = 'lab probe' routes through __setattr__'s else
	branch (name is neither 'fahrenheit') and stores via object.__setattr__."

	self assert: (testModule @env1:___pyAttrLoad___: #arbitrary_attr_after_set)
		equals: 'lab probe'.

]
