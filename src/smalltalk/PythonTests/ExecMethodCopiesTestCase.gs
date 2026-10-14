! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExecMethodCopiesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ExecMethodCopiesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ExecMethodCopiesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ExecMethodCopiesTestCase - a copied method keeps the exec's globals
! ===============================================================================
! exec compiles its source with the exec's globals as the compile SCOPE, and a
! method of a class that source defines reads those globals through it.  Grail
! recompiles a method's text to copy it -- the original kept under a second
! selector when an instance attribute or ``del'' covers it, a varargs forward
! rewritten to reach that copy, a second base's methods given to a class --
! and each copy was compiled WITHOUT the scope.  A global name then bound to
! whatever else answers to it, usually the class backing the module of that
! name, and the call died with an uncatchable MessageNotUnderstood.
!
! pytest's unittest plugin sets the test method on the TestCase instance before
! every test, and imports a module whose asserts it rewrote through exec, so
! every unittest-style test that called a module's function failed: jmespath's
! own tests ran ``jmespath.search'' unbound.  tests/python/exec_method_copies.py
! holds the checks, each against CPython 3.14.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ExecMethodCopiesTestCase removeAllMethods.
ExecMethodCopiesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ExecMethodCopiesTestCase
setUp

	importlib @env1:modules removeKey: #'exec_method_copies' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exec_method_copies.py')
		name: 'exec_method_copies'
%

category: 'Grail-Helpers'
method: ExecMethodCopiesTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: ExecMethodCopiesTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - copies keep the scope'
method: ExecMethodCopiesTestCase
testMethodsExecdIntoADictionary

	self assertAll: #('exec_into_a_dict')
%

category: 'Grail-Tests - copies keep the scope'
method: ExecMethodCopiesTestCase
testMethodsExecdIntoAModule
	"pytest's case: the globals are a module's, the one its loader made."

	self assertAll: #('exec_into_a_module' 'the_global_is_still_the_module')
%

category: 'Grail-Tests - copies keep the scope'
method: ExecMethodCopiesTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 3 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 3
%
