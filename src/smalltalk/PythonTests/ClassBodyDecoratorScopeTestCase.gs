! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyDecoratorScopeTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyDecoratorScopeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyDecoratorScopeTestCase - a method decorator reads the class body.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyDecoratorScopeTestCase removeAllMethods.
ClassBodyDecoratorScopeTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Class Body'
method: ClassBodyDecoratorScopeTestCase
testAMethodDecoratorReadsTheClassBodyNamespace
	"CPython's class body is ONE namespace, and a decorator expression above a
	def reads names bound earlier in it.  Grail has no class-body namespace: it
	compiles the defs to methods and applies their decorators once the class
	exists, resolving a sibling name off the class.  That compensation listed
	only the names bound as DEFS -- enough for ``@t.register(int)'' and not for
	the commoner shape, a flag computed in the class body and read by the
	decorator above the def.

	Two failure modes, and the second is the worse one:

	  * inside a decorator EXPRESSION the name fell through to the module and
	    raised NameError, which the application handler swallows, so the guard
	    silently never applied.  test_builtin and test_warnings each skip a
	    test this way and neither could report it;
	  * as the decorator ITSELF (``@_deco'') the parser records a Symbol rather
	    than a NameAst, so it never reached that lookup and emitted a bare
	    Smalltalk identifier -- a COMPILE error, which takes the whole module
	    down rather than one decorator.

	Three of the six checks are CONTROLS on the shadowing rule: a module global
	must still resolve when the class body does NOT bind the name, the class
	body must WIN when it does, and the already-working called-sibling shape
	must survive the reordering."

	| mod |
	importlib @env1:modules removeKey: #'class_body_decorator_scope' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_body_decorator_scope.py')
		name: 'class_body_decorator_scope'.
	#( 'a_decorator_argument_reads_a_class_body_local'
	   "Controls on the shadowing rule."
	   'a_decorator_argument_still_reads_a_module_global'
	   'a_class_body_binding_shadows_a_module_global'
	   "The compile-error case."
	   'a_bare_sibling_def_can_be_the_decorator'
	   'a_called_sibling_def_can_be_the_decorator'
	   "End to end: the mark has to reach the method for the skip to happen."
	   'a_skip_reading_a_class_body_flag_applies' ) do: [:k |
		| answer |
		answer := (mod @env1:RESULTS) @env1:__getitem__: k.
		self assert: (answer = true)
			description: 'class-body decorator scope check failed: ' , k , ' -> '
				, answer printString]
%
