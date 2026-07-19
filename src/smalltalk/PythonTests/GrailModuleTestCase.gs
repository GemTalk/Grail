! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- GrailSTestTarget: plain Smalltalk class with no own
! instVarNames, used as the target for @smalltalk_class decorator tests.
! Lives in PythonTests so the decorator can find it via
! smalltalk_class(dictionary='PythonTests', class_name='GrailSTestTarget').
expectvalue /Class
doit
Object subclass: 'GrailSTestTarget'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

! ------------------- Class definition for GrailModuleTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'GrailModuleTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
GrailModuleTestCase category: 'Grail-SUnit'
%

set compile_env: 0

expectvalue /Metaclass3
doit
GrailModuleTestCase removeAllMethods.
GrailModuleTestCase class removeAllMethods.
%

! ===============================================================================
! Setup / teardown
! ===============================================================================

category: 'Grail-Setup'
method: GrailModuleTestCase
setUp
	"Flush any previously installed extension methods from GrailSTestTarget,
	clear the module cache, then load the happy-path fixture so each test
	starts from a known state."
	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'grail_smalltalk_class' ifAbsent: [].
	self removeExtensionMethods.
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/grail_smalltalk_class.py')
		name: 'grail_smalltalk_class'.
%

category: 'Grail-Setup'
method: GrailModuleTestCase
removeExtensionMethods
	"Remove all 'Grail-ST-Extension' methods installed on GrailSTestTarget
	so each test begins with a clean class."
	| md toRemove |
	md := GrailSTestTarget @env0:methodDictForEnv: 1.
	md isNil ifTrue: [^ self].
	toRemove := OrderedCollection new.
	md @env0:keysDo: [:sel |
		| cat |
		cat := GrailSTestTarget @env0:categoryOfSelector: sel environmentId: 1.
		(cat notNil and: [cat = 'Grail-ST-Extension']) ifTrue: [toRemove add: sel]].
	toRemove do: [:sel | GrailSTestTarget @env0:removeSelector: sel environmentId: 1].
%

! ===============================================================================
! Compatibility helpers
! ===============================================================================

category: 'Grail-Tests - grail module'
method: GrailModuleTestCase
comparingStringBetween: expected and: actual
	"String>>streamContents: calls WriteStream>>positionA which is absent in
	this GemStone build.  Use printString concatenation instead."
	^ 'Expected ' , expected printString , ' but was ' , actual printString , '.'
%

! ===============================================================================
! Happy-path tests
! ===============================================================================

category: 'Grail-Tests - grail module'
method: GrailModuleTestCase
testNullaryMethodInstalled
	"A method defined inside @smalltalk_class body is callable on instances
	of the target Smalltalk class."
	| inst result |
	inst := GrailSTestTarget @env0:new.
	result := inst @env1:grail_hello.
	self assert: result equals: 'hello from grail'.
%

category: 'Grail-Tests - grail module'
method: GrailModuleTestCase
testMethodWithArguments
	"A method with positional arguments is installed and returns the correct value."
	| inst result |
	inst := GrailSTestTarget @env0:new.
	result := inst @env1:grail_add: 3 _: 4.
	self assert: result equals: 7.
%

category: 'Grail-Tests - grail module'
method: GrailModuleTestCase
testDecoratorReturnsTargetClass
	"The decorated name in the Python module refers to the original Smalltalk
	class, not a freshly-created Python class."
	| cls |
	cls := testModule @env1:GrailSTestTarget.
	self assert: cls equals: GrailSTestTarget.
%

! ===============================================================================
! Error-case tests
! ===============================================================================

category: 'Grail-Tests - grail module'
method: GrailModuleTestCase
testMissingSlotsMustRaiseTypeError
	"Importing a module whose @smalltalk_class class omits __slots__ raises TypeError."
	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'grail_smalltalk_class_no_slots' ifAbsent: [].
	self should: [
		importlib
			loadModuleFromPath: (importlib grailDir , '/tests/python/grail_smalltalk_class_no_slots.py')
			name: 'grail_smalltalk_class_no_slots'
	] raise: TypeError.
%

category: 'Grail-Tests - grail module'
method: GrailModuleTestCase
testWrongSlotsMustRaiseTypeError
	"Importing a module whose __slots__ don't match the target's instVarNames raises TypeError."
	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'grail_smalltalk_class_wrong_slots' ifAbsent: [].
	self should: [
		importlib
			loadModuleFromPath: (importlib grailDir , '/tests/python/grail_smalltalk_class_wrong_slots.py')
			name: 'grail_smalltalk_class_wrong_slots'
	] raise: TypeError.
%

category: 'Grail-Tests - grail module'
method: GrailModuleTestCase
testClassNotFoundRaisesAttributeError
	"Looking up a class that doesn't exist raises AttributeError."
	self should: [
		grail @env0:___lookupClass: 'NoSuchClassXYZ987' inDictionary: 'Globals'
	] raise: AttributeError.
%

category: 'Grail-Tests - grail module'
method: GrailModuleTestCase
testModuleFunctionIsFirstClass
	"A 0-arg native module FUNCTION read as an attribute (``from random
	import random'', ``time.time'') must be a first-class callable, NOT
	auto-invoked to its return value.  The getattr dispatch (Object>>
	___pyAttrLoad___) previously performed any non-``Grail-Methods'' unary
	module method, so ``random'' (category ``Grail-Built-in Functions'')
	bound the float random() returns -- test_math's testFsum did
	``from random import random'' then ``random()'' -> 'SmallDouble' object
	is not callable.  The fix wraps the FUNCTION categories as BoundMethods
	while leaving value accessors (``__name__'') performed."

	"random is a first-class callable; calling it yields a float in [0, 1)."
	self assert: (self eval: 'from random import random
type(random).__name__') equals: 'BoundMethod'.
	self assert: (self eval: 'from random import random
0.0 <= random() < 1.0') equals: true.
	"Multi-arg functions were already callable -- keep them regressed."
	self assert: (self eval: 'from random import gauss, shuffle
type(gauss).__name__ == ''BoundMethod'' and type(shuffle).__name__ == ''BoundMethod''') equals: true.
	"The fix generalises to other native module functions (time.time)."
	self assert: (self eval: 'import time
type(time.time).__name__') equals: 'BoundMethod'.
	"getstate raises NotImplementedError when CALLED; before the fix,
	merely importing it auto-invoked it and the import blew up.  Now it is
	a first-class BoundMethod that only raises on an actual call."
	self assert: (self eval: 'from random import getstate
type(getstate).__name__') equals: 'BoundMethod'.
	"A value accessor (category ``Grail-Accessors'', e.g. sys.stdout) STILL
	reads as its value, not a BoundMethod -- the default stays perform."
	self assert: (self eval: 'import sys
type(sys.stdout).__name__ != ''BoundMethod''') equals: true.
%
