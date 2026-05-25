! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AttributeProtocolTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AttributeProtocolTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
AttributeProtocolTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AttributeProtocolTestCase
!
! Verifies the user-overridable Python attribute protocol:
!   __setattr__(self, name, value)  — intercepts ALL writes
!   __getattr__(self, name)         — fallback on load miss
!
! Use case: Thermometer stores Celsius internally, exposes both
! .celsius and .fahrenheit; __setattr__ converts F→C on write,
! __getattr__ computes C→F on read.  See tests/python/attribute_protocol.py.
!
! Pre-fix: AssignAst's foreign-receiver path emits the helper
! ``___pyAttrStore___:put:'' which writes straight to dynamic-instVar
! storage — it does NOT consult any user __setattr__ override.  So
! ``t.fahrenheit = 32'' stores 32 into a literal 'fahrenheit' slot
! instead of converting and storing 0.0 into 'celsius'.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
AttributeProtocolTestCase removeAllMethods.
AttributeProtocolTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: AttributeProtocolTestCase
setUp
	"Reload tests/python/attribute_protocol.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'attribute_protocol' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/attribute_protocol.py')
		name: 'attribute_protocol'.
%

! --- __init__ + __getattr__ for computed read ---

category: 'Grail-Tests - getattr override'
method: AttributeProtocolTestCase
testInitStoresCelsius
	"Constructing Thermometer(100) goes through __setattr__('celsius', 100)
	which delegates to object.__setattr__ — celsius lands in the dict."

	self assert: (testModule @env1:___pyAttrLoad___: #celsius_init) equals: 100.
%

category: 'Grail-Tests - getattr override'
method: AttributeProtocolTestCase
testGetattrComputesFahrenheit
	"Reading t.fahrenheit on a Thermometer with celsius=100 falls
	through to __getattr__ (no 'fahrenheit' slot exists), which
	computes 100 * 9/5 + 32 = 212.0."

	self assert: (testModule @env1:___pyAttrLoad___: #fahrenheit_read) equals: 212.
%

! --- __setattr__ for converted write ---

category: 'Grail-Tests - setattr override'
method: AttributeProtocolTestCase
testSetattrConvertsFahrenheitToCelsius
	"Setting t.fahrenheit = 32 must call __setattr__, which converts
	32°F to 0°C and stores celsius via object.__setattr__."

	self assert: (testModule @env1:___pyAttrLoad___: #celsius_after_freezing)
		equals: 0.
%

category: 'Grail-Tests - setattr override'
method: AttributeProtocolTestCase
testFahrenheitRoundTripsAfterSet
	"After setting fahrenheit = 32, reading fahrenheit back yields 32.0."

	self assert: (testModule @env1:___pyAttrLoad___: #fahrenheit_after_freezing)
		equals: 32.
%

! --- Mixed C/F writes go to the same underlying state ---

category: 'Grail-Tests - setattr override'
method: AttributeProtocolTestCase
testCelsiusSetThenRead
	"Direct .celsius = 100 store routes through __setattr__'s else
	branch and lands in the dict."

	self assert: (testModule @env1:___pyAttrLoad___: #celsius_first) equals: 100.
%

category: 'Grail-Tests - setattr override'
method: AttributeProtocolTestCase
testFahrenheitDerivedAfterCelsiusSet
	"After celsius = 100, fahrenheit reads 212.0 via __getattr__."

	self assert: (testModule @env1:___pyAttrLoad___: #fahrenheit_first) equals: 212.
%

category: 'Grail-Tests - setattr override'
method: AttributeProtocolTestCase
testFahrenheitOverwriteUpdatesCelsius
	"Setting fahrenheit = 32 after celsius was 100 overwrites celsius to 0.0."

	self assert: (testModule @env1:___pyAttrLoad___: #celsius_second) equals: 0.
	self assert: (testModule @env1:___pyAttrLoad___: #fahrenheit_second) equals: 32.
%

! --- __getattr__ raises for genuinely-missing names ---

category: 'Grail-Tests - getattr override'
method: AttributeProtocolTestCase
testGetattrRaisesForMissingName
	"__getattr__ on a name other than 'fahrenheit' must raise
	AttributeError per the user definition."

	self assert: (testModule @env1:___pyAttrLoad___: #missing_attr)
		equals: 'attribute_error'.
%

! --- __setattr__ else-branch handles arbitrary names ---

category: 'Grail-Tests - setattr override'
method: AttributeProtocolTestCase
testSetattrElseBranchStoresArbitraryName
	"Setting t.label = 'lab probe' routes through __setattr__'s else
	branch (name is neither 'fahrenheit') and stores via object.__setattr__."

	self assert: (testModule @env1:___pyAttrLoad___: #arbitrary_attr_after_set)
		equals: 'lab probe'.
%
