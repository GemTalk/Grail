! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'NestedQualnameTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NestedQualnameTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NestedQualnameTestCase - __qualname__ for nested classes, defs, and methods.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
NestedQualnameTestCase removeAllMethods.
NestedQualnameTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Introspection'
method: NestedQualnameTestCase
testNestedQualnames
	"CPython names every enclosing scope in a ``__qualname__'', outermost first,
	and inserts ``<locals>'' after any scope that is a FUNCTION -- a class body
	is not a function scope, so ``class A: class B'' is ``A.B'' while
	``def f(): class B'' is ``f.<locals>.B''.

	Grail's emission context used to hold ONE enclosing class and ONE enclosing
	function, which failed two ways.  A chain deeper than one level was
	TRUNCATED (``def a(): def b(): def c()'' reported ``b.<locals>.c''), and a
	CLASS could not read its own nesting at all: ClassDefAst sets the class slot
	to ITSELF before emitting the body, so reading it back produced
	``InFunc.fn.<locals>.InFunc'' and regressed every top-level class to
	``Outer.Outer''.  The top-level check below is the guard for that second
	failure, which is the one a test would otherwise not notice: it is a
	REGRESSION in the common case, dressed as a fix for the rare one.

	Both now read from CallAst >> ___scopeStack___, whose frames carry node
	identity so a node stops at its OWN frame rather than trusting the top of the
	stack to belong to someone else.

	All thirteen checks answer identically under real CPython, verified by
	running the fixture directly.  See tests/python/nested_qualnames.py."

	| mod |
	importlib @env1:modules removeKey: #'nested_qualnames' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/nested_qualnames.py')
		name: 'nested_qualnames'.
	#( 'a_def_in_a_function_is_locals_qualified'
	   'a_def_in_a_method_names_the_class_too'
	   'a_def_three_scopes_deep_keeps_every_link'
	   'a_top_level_class_is_its_bare_name'
	   'a_class_in_a_function_is_locals_qualified'
	   'a_class_in_a_method_names_the_enclosing_class'
	   'a_class_in_a_class_has_no_locals'
	   'a_class_three_classes_deep_keeps_every_link'
	   'a_class_three_scopes_deep_keeps_every_link'
	   'a_class_under_an_if_is_still_function_scoped'
	   'a_method_of_a_nested_class_inherits_the_nesting'
	   'a_method_of_a_top_level_class_is_unchanged'
	   'a_bound_method_of_a_nested_class_inherits_the_nesting'
	   "Lambdas, which had no ___pyNamed___ stamp at all and so answered the
	    ``<closure>'' placeholder for both __name__ and __qualname__ -- co_name
	    was already right, which is what made it look like a rendering problem."
	   'a_module_level_lambda_is_bare'
	   'a_lambda_name_is_lambda_not_a_placeholder'
	   'a_lambda_in_a_function_is_locals_qualified'
	   'two_lambdas_in_one_scope_share_a_qualname'
	   'a_lambda_in_a_class_body_has_no_locals'
	   "``global g'' then ``def g'' binds at module level, so the scopes it is
	    WRITTEN in contribute nothing to its qualname -- and it becomes the root
	    that defs nested inside it are named from."
	   'a_global_declared_def_is_bare'
	   'a_def_inside_a_global_declared_def_roots_there' ) do: [:k |
		| answer |
		answer := mod @env0:perform: k asSymbol env: 1.
		self assert: (answer = true)
			description: 'qualname check failed: ' , k , ' -> ' , answer printString]
%
