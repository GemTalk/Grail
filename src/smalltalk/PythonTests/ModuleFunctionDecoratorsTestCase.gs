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
	mods removeKey: #'module_function_decorators' ifAbsent: [].
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

category: 'Grail-Tests'
method: ModuleFunctionDecoratorsTestCase
testInstanceDecoratorIsApplied
	"@tag_it where tag_it is an INSTANCE with __call__, not a function.
	The module-scope decorator path applies it through
	___pyCallValue___:kw: and used to swallow the resulting ``not
	callable'' TypeError, leaving the function undecorated."

	self assert: (testModule @env1:___pyAttrLoad___: #'tagged_result')
		equals: '[t] go'.
%

category: 'Grail-Tests'
method: ModuleFunctionDecoratorsTestCase
testARecursingDecoratorRaisesRecursionError
	"A decorator is applied inside a handler that catches everything, so that a
	decorator Grail cannot apply leaves the def undecorated (issue #1369).  The
	handler also caught the stack running out, both as the VM's raw warning and
	as the RecursionError it becomes, so a decorator that recursed was silently
	dropped where CPython raises RecursionError.  This was measured at the
	module-level, class-body method and property-setter sites, on both codegen
	paths.  The class decorator and a decorated nested def were already right
	and are controls.

	See tests/python/decorator_recursion_error.py (CPython 3.14's values) and
	its helper, which holds the top-level def, since only a top-level def
	reaches the module-level emitter."

	| mod results expected b |
	importlib @env1:modules removeKey: #'decorator_recursion_error' ifAbsent: [].
	[mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/decorator_recursion_error.py')
		name: 'decorator_recursion_error'.
	 results := mod @env1:___pyAttrLoad___: #'r'.
	 expected := mod @env1:___pyAttrLoad___: #'EXPECTED'.
	 b := (Python at: #'builtins') @env1:instance.
	 #( 'module_level' 'method_decorator' 'property_setter_decorator'
	    'class_decorator' 'nested_def_decorator' 'plain_recursion_after' ) do: [:k |
		| got want |
		got := (b @env1:repr: (results @env1:__getitem__: k)) asString.
		want := (b @env1:repr: (expected @env1:__getitem__: k)) asString.
		self assert: got equals: want
			description: k , ': got ' , got , ' want ' , want]]
		ensure: [
			importlib @env1:modules removeKey: #'decorator_recursion_error' ifAbsent: [].
			importlib @env1:modules removeKey: #'decorator_recursion_helper' ifAbsent: []]
%
