! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for CallingConventionTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'CallingConventionTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
CallingConventionTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! CallingConventionTestCase
!
! CPython raises TypeError when a call supplies more positional args than the
! function accepts (with no *args) or an unexpected keyword arg (with no
! **kwargs).  Grail used to SILENTLY DROP the extras, so ``operator.pow(1, 2,
! 3)'' returned 1 and attrgetter/itemgetter/methodcaller's over-supplied
! __call__ never raised (test_operator).
!
! Fix: FunctionDefAst>>printArgCountChecksOn:... emits both guards in the
! varargs prologue AND the varargs forwarder (simple-positional defs); *args /
! **kwargs suppress the respective guard.  (The unexpected-keyword guard first
! exposed a latent WeakMethod/Django-signals bug, fixed in weakref.py.)
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
CallingConventionTestCase removeAllMethods.
CallingConventionTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: CallingConventionTestCase
setUp
	"Reload tests/python/calling_convention.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'calling_convention' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/calling_convention.py')
		name: 'calling_convention'.
%

! --- correct calls still work ---

category: 'Grail-Tests - Valid Calls'
method: CallingConventionTestCase
testCorrectPositional
	self assert: (testModule @env1:correct_positional) equals: true
%

category: 'Grail-Tests - Valid Calls'
method: CallingConventionTestCase
testCorrectKeyword
	self assert: (testModule @env1:correct_keyword) equals: true
%

category: 'Grail-Tests - Valid Calls'
method: CallingConventionTestCase
testDefaultUsed
	self assert: (testModule @env1:default_used) equals: true
%

category: 'Grail-Tests - Valid Calls'
method: CallingConventionTestCase
testKwonlyOk
	self assert: (testModule @env1:kwonly_ok) equals: true
%

category: 'Grail-Tests - Valid Calls'
method: CallingConventionTestCase
testMethodOk
	self assert: (testModule @env1:method_ok) equals: 'x'
%

! --- too many positional -> TypeError ---

category: 'Grail-Tests - Too Many Positional'
method: CallingConventionTestCase
testTooManyPositional
	self assert: (testModule @env1:toomany_positional) equals: 'TypeError'
%

category: 'Grail-Tests - Too Many Positional'
method: CallingConventionTestCase
testDefaultTooMany
	self assert: (testModule @env1:default_toomany) equals: 'TypeError'
%

category: 'Grail-Tests - Too Many Positional'
method: CallingConventionTestCase
testMethodTooMany
	self assert: (testModule @env1:method_toomany) equals: 'TypeError'
%

category: 'Grail-Tests - Too Many Positional'
method: CallingConventionTestCase
testMissingRequired
	self assert: (testModule @env1:missing_required) equals: 'TypeError'
%

! --- unexpected keyword -> TypeError ---

category: 'Grail-Tests - Unexpected Keyword'
method: CallingConventionTestCase
testUnexpectedKeyword
	self assert: (testModule @env1:unexpected_keyword) equals: 'TypeError'
%

category: 'Grail-Tests - Unexpected Keyword'
method: CallingConventionTestCase
testKwonlyUnexpected
	self assert: (testModule @env1:kwonly_unexpected) equals: 'TypeError'
%

category: 'Grail-Tests - Unexpected Keyword'
method: CallingConventionTestCase
testMethodUnexpectedKeyword
	self assert: (testModule @env1:method_unexpected_keyword) equals: 'TypeError'
%

! --- *args / **kwargs absorb extras (no false positives) ---

category: 'Grail-Tests - Varargs Absorb'
method: CallingConventionTestCase
testStarargsAbsorbsExtras
	self assert: (testModule @env1:starargs_absorbs) equals: true
%

category: 'Grail-Tests - Varargs Absorb'
method: CallingConventionTestCase
testKwargsAbsorbsExtras
	self assert: (testModule @env1:kwargs_absorbs) equals: true
%
