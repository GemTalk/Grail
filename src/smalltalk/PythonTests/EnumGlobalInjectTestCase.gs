! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumGlobalInjectTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumGlobalInjectTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumGlobalInjectTestCase category: 'Grail-SUnit'
%

set compile_env: 0

expectvalue /Metaclass3
doit
EnumGlobalInjectTestCase removeAllMethods.
EnumGlobalInjectTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumGlobalInjectTestCase
setUp

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_global_inject' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_global_inject.py')
		name: 'enum_global_inject'.
%

category: 'Grail-Tests - Enum Global Inject'
method: EnumGlobalInjectTestCase
testClassSideMembersStillAccessible
	"MyFlag.ALPHA / MyFlag.BETA still work after the decorators run."

	self assert: (testModule @env1:cls_alpha) equals: 1.
	self assert: (testModule @env1:cls_beta) equals: 2.
%

category: 'Grail-Tests - Enum Global Inject'
method: EnumGlobalInjectTestCase
testMembersInjectedAsModuleGlobals
	"@enum.global_enum put ALPHA / BETA / GAMMA directly in the
	module's namespace; bare reads work without the class prefix."

	self assert: (testModule @env1:direct_alpha) equals: 1.
	self assert: (testModule @env1:direct_beta) equals: 2.
	self assert: (testModule @env1:direct_gamma) equals: 4.
%

category: 'Grail-Tests - Enum Global Inject'
method: EnumGlobalInjectTestCase
testBitwiseOpsOnInjectedMembers
	"`flags & ALPHA` style — what re/__init__.py uses
	(`if flags & DEBUG:`).  Members are ints, so | and & are just
	integer bitwise ops."

	self assert: (testModule @env1:combined) equals: 3.
	self assert: (testModule @env1:has_alpha) equals: true.
%
