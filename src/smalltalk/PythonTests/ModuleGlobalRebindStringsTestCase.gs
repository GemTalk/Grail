! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ModuleGlobalRebindStringsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
ModuleGlobalRebindStringsTestCase comment:
'Rebinding a module global to a string that GemStone''s Unicode collation
calls equal to the old one -- an NFD letter and its precomposed form, an
Arabic-Indic digit and its ASCII twin -- must still rebind it.  The
module-store skip for an unchanged immutable value compared strings with the
kernel ``='''', so the old string stayed, and a module-level for loop over
such strings yielded its first element again.

Expectations in tests/python/module_global_rebind_strings.py come from
CPython 3.14.8.'
%

doit
ModuleGlobalRebindStringsTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
ModuleGlobalRebindStringsTestCase removeAllMethods: 0.
ModuleGlobalRebindStringsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: ModuleGlobalRebindStringsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'module_global_rebind_strings' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_global_rebind_strings.py')
		name: 'module_global_rebind_strings'.
%

category: 'Grail-Helpers'
method: ModuleGlobalRebindStringsTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: ModuleGlobalRebindStringsTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: ModuleGlobalRebindStringsTestCase
testRebindingToACollationEqualString
	self assertAll: #('rebound_nfc' 'rebound_digits' 'loop' 'unchanged')
%
