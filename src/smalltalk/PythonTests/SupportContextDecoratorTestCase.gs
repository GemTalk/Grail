! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'SupportContextDecoratorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SupportContextDecoratorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SupportContextDecoratorTestCase - test.support CMs usable as decorators.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SupportContextDecoratorTestCase removeAllMethods.
SupportContextDecoratorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - CPython Harness Support'
method: SupportContextDecoratorTestCase
testSupportContextManagersAreAlsoDecorators
	"Upstream writes each of these as @contextlib.contextmanager, and the
	_GeneratorContextManager it returns inherits ContextDecorator -- so every
	one works as ``@name(...)'' as well as in a with-statement.  Grail writes
	them as plain classes, which gave them __enter__ and __exit__ and no
	__call__, so the decorator form raised AttributeError.

	Invisible, like every other defect in this family: the decorator sits in a
	class body, and Grail drops a class-body decorator whose application
	fails, so the guard silently never ran.  test_richcmp's
	``@support.infinite_recursion(25)'' is the measured case -- with the
	swallow removed to make it speak, test_richcmp went IMPORTERROR, and with
	this fix it is OK again.

	A LIST, not a sweep, and the list was measured against CPython rather than
	guessed: the eight named here are @contextlib.contextmanager upstream, and
	catch_unraisable_exception is a plain class.  Giving that one a __call__
	would be a divergence, so a check asserts it does NOT have one."

	| mod |
	importlib @env1:modules removeKey: #'support_context_decorators' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/support_context_decorators.py')
		name: 'support_context_decorators'.
	#( 'infinite_recursion_decorates'
	   "By SHAPE, not by running: Grail's set_recursion_limit raises on entry
	    by design, since the recursion limit here is stack exhaustion."
	   'set_recursion_limit_is_callable_as_a_decorator'
	   'adjust_int_max_str_digits_decorates'
	   'swap_attr_decorates'
	   'swap_item_decorates'
	   'captured_stdout_decorates'
	   'captured_stderr_decorates'
	   'captured_output_decorates'
	   "Controls: the with-statement shape must be untouched, a stateful CM
	    must still RESTORE when driven as a decorator, and the one class
	    upstream leaves undecoratable must stay that way."
	   'the_context_manager_form_still_works'
	   'swap_attr_still_restores_through_the_decorator'
	   'catch_unraisable_exception_is_not_a_decorator' ) do: [:k |
		| answer |
		answer := (mod @env1:RESULTS) @env1:__getitem__: k.
		self assert: (answer = true)
			description: 'support context-decorator check failed: ' , k , ' -> '
				, answer printString]
%
