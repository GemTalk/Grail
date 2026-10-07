! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ModuleGlobalsPast255TestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
ModuleGlobalsPast255TestCase comment:
'A module with more than 255 globals.  GemStone caps dynamic instVars, where
Grail keeps module globals, at 255 per object; the 256th stopped the program
with an uncatchable ImproperOperation.  Globals past the ceiling now go to an
unbounded holder (module >> ___storeNewGlobal___:put:) that every read, store,
delete and listing consults.

Every expectation in tests/python/module_globals_past_255.py was produced by
CPython 3.14.8; the fixture gate re-checks it there.'
%

doit
ModuleGlobalsPast255TestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
ModuleGlobalsPast255TestCase removeAllMethods: 0.
ModuleGlobalsPast255TestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: ModuleGlobalsPast255TestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'module_globals_past_255' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_globals_past_255.py')
		name: 'module_globals_past_255'.
%

category: 'Grail-Helpers'
method: ModuleGlobalsPast255TestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: ModuleGlobalsPast255TestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: ModuleGlobalsPast255TestCase
testBodyBindsPastTheCeiling
	self assertAll: #('count' 'order' 'first_and_last' 'aug_assign' 'deleted'
		'unpack_and_loop' 'imports' 'rebound_def' 'class' 'annotated'
		'walrus_and_exec' 'module_attrs')
%

category: 'Grail-Tests'
method: ModuleGlobalsPast255TestCase
testRuntimeStoresPastTheCeiling
	self assertAll: #('runtime' 'runtime_listed')
%
