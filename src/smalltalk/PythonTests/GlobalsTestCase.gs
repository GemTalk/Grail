! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for GlobalsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'GlobalsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
GlobalsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! GlobalsTestCase -- globals() / module-scope locals() / vars() / mod.__dict__
! as a LIVE, coherent dict view (PyModuleDict over the module's three-store
! namespace; docs/LEGB.md).  Regression for the raw-module-instance globals()
! whose reads/writes hit the empty inherited SymbolDictionary slot while user
! globals lived in dynamic instVars, and whose g.keys() executed the inherited
! kernel selector ("'OrderedCollection' object is not callable").
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
GlobalsTestCase removeAllMethods.
GlobalsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-globals'
method: GlobalsTestCase
setUp
	"Load tests/python/globals_probe.py fresh each test (its module-level
	code IS the test body; the methods below assert the recorded results)."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'globals_probe' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/globals_probe.py')
		name: 'globals_probe'
%

category: 'Grail-Tests-globals'
method: GlobalsTestCase
attr: aSymbol
	^ testModule @env1:___pyAttrLoad___: aSymbol
%

category: 'Grail-Tests-globals'
method: GlobalsTestCase
testReadsSeeRealGlobals
	"g[k] / in / get / keys / values / items / iteration all resolve the
	module's actual globals (dynamic instVars), not the empty dict slot."

	self assert: (self attr: #'GETITEM') equals: 1.
	self assert: (self attr: #'CONTAINS') equals: true.
	self assert: (self attr: #'GET') equals: 3.
	self assert: (self attr: #'GET_DEFAULT') equals: 'dflt'.
	self assert: (self attr: #'KEYS_HAS') equals: true.
	self assert: (self attr: #'VALUES_HAS') equals: true.
	self assert: (self attr: #'ITEMS_HAS') equals: true.
	self assert: (self attr: #'ITER_HAS') equals: true.
	self assert: (self attr: #'LEN_OK') equals: true.
	self assert: (self attr: #'MISSING_RAISES') equals: true
%

category: 'Grail-Tests-globals'
method: GlobalsTestCase
testInsertionOrderAndDictness
	"User globals iterate in insertion order; isinstance(g, dict) holds."

	self assert: (self attr: #'ORDERED') @env1:__repr__
		equals: '[''zz_g'', ''aa_g'', ''mm_g'']'.
	self assert: (self attr: #'IS_DICT') equals: true
%

category: 'Grail-Tests-globals'
method: GlobalsTestCase
testTopLevelDefsAreGlobals
	"A top-level def is visible in globals() and retrievable as a callable
	BEFORE any bare-name read wraps it."

	self assert: (self attr: #'FN_CONTAINS') equals: true.
	self assert: (self attr: #'FN_CALL') equals: 'from-top-fn'
%

category: 'Grail-Tests-globals'
method: GlobalsTestCase
testWritesAreLive
	"g[k]=v / update / setdefault / pop create-and-remove REAL globals,
	readable by bare name afterwards (the re._constants._makecodes idiom)."

	self assert: (self attr: #'INJECTED_READ') equals: 42.
	self assert: (self attr: #'WRITE_VISIBLE') equals: 'via-view'.
	self assert: (self attr: #'POP') equals: 42.
	self assert: (self attr: #'POP_GONE') equals: true.
	self assert: (self attr: #'POP_DEFAULT') equals: 'gone'.
	self assert: (self attr: #'SETDEF_EXISTING') equals: 1.
	self assert: (self attr: #'SETDEF_NEW') equals: 'fresh'.
	self assert: (self attr: #'UPDATE_VISIBLE') equals: 30
%

category: 'Grail-Tests-globals'
method: GlobalsTestCase
testModuleScopeAliasesAndExec
	"Module-scope locals()/vars() are the same live namespace, and
	exec(src, globals()) both seeds from and reflects back into it."

	self assert: (self attr: #'LOCALS_SEES') equals: true.
	self assert: (self attr: #'VARS_SEES') equals: true.
	self assert: (self attr: #'G_IS_G') equals: true.
	self assert: (self attr: #'L_IS_G') equals: true.
	self assert: (self attr: #'EXEC_VISIBLE') equals: 101
%

category: 'Grail-Tests-globals'
method: GlobalsTestCase
testModuleDunderDictIsLiveView
	"mod.__dict__ from OUTSIDE the module is the same live view."

	| view |
	view := testModule @env1:___pyAttrLoad___: #'__dict__'.
	self assert: (view @env1:__contains__: 'zz_g') equals: true.
	self assert: (view @env1:__getitem__: 'zz_g') equals: 1.
	view @env1:__setitem__: 'outside_injected' _: 7.
	self assert: (testModule @env1:___pyAttrLoad___: #'outside_injected') equals: 7
%
