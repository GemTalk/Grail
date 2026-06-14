! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ModuleFunctionDecoratorsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ModuleFunctionDecoratorsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ModuleFunctionDecoratorsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ModuleFunctionDecoratorsTestCase
!
! Module-level function decorators must run at module-body time and rebind
! the function name to the decorator result.  Before the fix, a top-level
! ``@deco def f'' dropped the decorator (only jinja2's 3-name pass_* whitelist
! was applied); now the general chain ``@A @B def f'' -> A(B(f)) is emitted,
! stored in f's dynamic-instVar slot so attribute reads and bare calls pick
! up the decorated result.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ModuleFunctionDecoratorsTestCase removeAllMethods.
ModuleFunctionDecoratorsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ModuleFunctionDecoratorsTestCase
setUp
	"Load tests/python/module_function_decorators.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'module_function_decorators' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_function_decorators.py')
		name: 'module_function_decorators'.
%

category: 'Grail-Tests'
method: ModuleFunctionDecoratorsTestCase
testTagAndReturnDecoratorRuns
	"@tag mutates the function (sets .tagged) and returns it; the tag is
	visible and the function is still callable."

	self assert: (testModule @env1:___pyAttrLoad___: #'greet_tagged') equals: true.
	self assert: (testModule @env1:___pyAttrLoad___: #'greet_result') equals: 'hello'.
%

category: 'Grail-Tests'
method: ModuleFunctionDecoratorsTestCase
testWrapperReplacingDecorator
	"@shout returns a NEW wrapper function; a bare call to the decorated
	name must dispatch to the wrapper, not the undecorated method."

	self assert: (testModule @env1:___pyAttrLoad___: #'say_result') equals: 'HI'.
%

category: 'Grail-Tests'
method: ModuleFunctionDecoratorsTestCase
testDecoratorFactoryWithArguments
	"@prefix('>> ') is a decorator factory: the call returns the actual
	decorator, which wraps the function."

	self assert: (testModule @env1:___pyAttrLoad___: #'line_result') equals: '>> go'.
%

category: 'Grail-Tests'
method: ModuleFunctionDecoratorsTestCase
testStackedDecoratorsApplyBottomUp
	"@prefix('A:') @prefix('B:') def f rebinds f to A(B(f)), so the
	outer decorator's prefix leads: 'A:' + 'B:' + 'x'."

	self assert: (testModule @env1:___pyAttrLoad___: #'stacked_result') equals: 'A:B:x'.
%
