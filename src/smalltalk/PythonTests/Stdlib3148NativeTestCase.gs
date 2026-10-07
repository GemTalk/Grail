! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'Stdlib3148NativeTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
Stdlib3148NativeTestCase comment:
'CPython 3.14.8 behaviour of zlib (libz''s own error text; flush on a corrupt
stream), exception member attributes (del resets them to None), and libexpat
2.8.5 as Grail''s pure-Python pyexpat models it (XML declaration version and
syntax, characters XML refuses, byte-order-mark columns, UTF-16 surrogates).

Every expectation in tests/python/stdlib_3148_native.py was produced by
CPython 3.14.8 with its bundled expat 2.8.5.'
%

doit
Stdlib3148NativeTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
Stdlib3148NativeTestCase removeAllMethods: 0.
Stdlib3148NativeTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: Stdlib3148NativeTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'stdlib_3148_native' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/stdlib_3148_native.py')
		name: 'stdlib_3148_native'.
%

category: 'Grail-Helpers'
method: Stdlib3148NativeTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: Stdlib3148NativeTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: Stdlib3148NativeTestCase
testZlib
	self assertAll: #('zlib')
%

category: 'Grail-Tests'
method: Stdlib3148NativeTestCase
testExceptionMembers
	self assertAll: #('members' 'suppress_context')
%

category: 'Grail-Tests'
method: Stdlib3148NativeTestCase
testExpat
	self assertAll: #('expat_versions' 'expat_declarations' 'expat_characters'
		'expat_surrogates' 'expat_text_declarations')
%
