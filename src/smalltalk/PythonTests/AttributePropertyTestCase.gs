! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AttributePropertyTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AttributePropertyTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
AttributePropertyTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AttributePropertyTestCase
!
! Same Thermometer pattern as AttributeProtocolTestCase but driven
! by Python's @property descriptor protocol instead of __setattr__/
! __getattr__ overrides.  @property is a data descriptor — its
! __set__ intercepts before the instance dict is checked, and its
! __get__ runs on every read.  Per-attribute scope (vs catch-all
! __setattr__) makes properties the idiomatic Python choice for
! computed attributes with both read and write semantics.
!
! Verifies the post-attribute-protocol-refactor codegen still
! honors the descriptor path: attribute-store dispatch through
! __setattr__ must NOT trample property setters, and attribute load
! through ___pyAttrLoad___ must hit the property getter rather than
! return the raw slot.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
AttributePropertyTestCase removeAllMethods.
AttributePropertyTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: AttributePropertyTestCase
setUp
	"Reload tests/python/attribute_property.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'attribute_property' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/attribute_property.py')
		name: 'attribute_property'.
%

category: 'Grail-Tests - Getter'
method: AttributePropertyTestCase
testCelsiusGetterReturnsStored
	"@property celsius getter returns the underlying _celsius slot."

	self assert: (testModule @env1:___pyAttrLoad___: #celsius_init) equals: 100.
%

category: 'Grail-Tests - Getter'
method: AttributePropertyTestCase
testFahrenheitGetterComputes
	"@property fahrenheit getter computes from _celsius."

	self assert: (testModule @env1:___pyAttrLoad___: #fahrenheit_read) equals: 212.
%

category: 'Grail-Tests - Setter'
method: AttributePropertyTestCase
testFahrenheitSetterConvertsToInternalSlot
	"@fahrenheit.setter converts F→C and writes _celsius."

	self assert: (testModule @env1:___pyAttrLoad___: #celsius_after_freezing) equals: 0.
%

category: 'Grail-Tests - Setter'
method: AttributePropertyTestCase
testFahrenheitRoundTripsAfterSet
	"After fahrenheit = 32, reading fahrenheit yields 32.0."

	self assert: (testModule @env1:___pyAttrLoad___: #fahrenheit_after_freezing) equals: 32.
%

category: 'Grail-Tests - Setter'
method: AttributePropertyTestCase
testCelsiusSetterWritesInternalSlot
	"@celsius.setter writes through to _celsius."

	self assert: (testModule @env1:___pyAttrLoad___: #celsius_first) equals: 100.
	self assert: (testModule @env1:___pyAttrLoad___: #fahrenheit_first) equals: 212.
%

category: 'Grail-Tests - Setter'
method: AttributePropertyTestCase
testFahrenheitOverwriteUpdatesCelsius
	"fahrenheit = 32 after celsius = 100 rewrites _celsius to 0.0."

	self assert: (testModule @env1:___pyAttrLoad___: #celsius_second) equals: 0.
	self assert: (testModule @env1:___pyAttrLoad___: #fahrenheit_second) equals: 32.
%

category: 'Grail-Tests - Internal Slot'
method: AttributePropertyTestCase
testPrivateSlotMatchesPublicGetter
	"The internal _celsius slot stays in sync with the public
	celsius property getter (no separate copy)."

	self assert: (testModule @env1:___pyAttrLoad___: #private_value) equals: 25.
	self assert: (testModule @env1:___pyAttrLoad___: #public_value) equals: 25.
%
