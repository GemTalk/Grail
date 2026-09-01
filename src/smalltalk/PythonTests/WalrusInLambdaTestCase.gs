! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'WalrusInLambdaTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
WalrusInLambdaTestCase comment:
'PEP 572: a lambda is a SCOPE, and a walrus in its body binds there.

``lambda: (n := 1) + n'' is legal Python and the binding is the
lambda''s own.  The parser knew that -- parseLambda pushes a scope and
the target was registered into it -- and then dropped the set on the
floor at popScope, which cost the name in THREE places, each of which
had assumed a lambda''s scope is its parameter list:

  * LambdaAst >> printSmalltalkOn: declares temps for parameters, so the
    store had no ``| n |'' to write to -- a Smalltalk CompileError,
    uncatchable, fatal to the whole enclosing method;
  * ___functionBindsPythonLocal___: looks for a BlockAst body with a
    ``writes'' set, and a lambda''s body is an EXPRESSION, so the LEGB
    walk decided the lambda binds nothing and carried on outwards;
  * LambdaAst >> isVariableIsDeclared: reads the parameter list only,
    which is the walk the class-body value emit consults before falling
    back to a module lookup.

The second is the worst, because it COMPILES.  With a same-named local
in the enclosing def, the lambda wrote the OUTER one:

    def f():
        n = 99
        fn = lambda: (n := 1) + n
        return (fn(), n)      # CPython (2, 99);  Grail said (2, 1)

LambdaAst now carries its own ``writes'' set and all three consult it.

THE OTHER HALF is placement.  A lambda body is ``expression'', not
``namedexpr'': ``lambda: x := 1'' is a SyntaxError, and CPython names
the lambda rather than saying ``invalid syntax''.  Grail parsed the
body PERMITTED, so it accepted the very thing the placement gate
exists to refuse -- and then could not compile it.  Fixing the scope
without this would have turned an uncatchable error into a silently
accepted one.

Took test.test_named_expressions 8 -> 6 (invalid_14, invalid_15).

See tests/python/walrus_in_lambda.py (20 checks, CPython-validated
first).'
%

expectvalue /Class
doit
WalrusInLambdaTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
WalrusInLambdaTestCase removeAllMethods: 0.
WalrusInLambdaTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: WalrusInLambdaTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'walrus_in_lambda' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/walrus_in_lambda.py')
		name: 'walrus_in_lambda'.
%

category: 'Grail-Helpers'
method: WalrusInLambdaTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: WalrusInLambdaTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: WalrusInLambdaTestCase
testTheBindingIsTheLambdaOwn
	"Including the one that used to COMPILE and answer the wrong number:
	an enclosing def with a same-named local got written by the lambda."

	self assertAll: #('plain' 'does_not_reach_the_enclosing_local'
		'fresh_every_call')
%

category: 'Grail-Tests'
method: WalrusInLambdaTestCase
testGlobalInTheEnclosingDefStaysThere
	"``global g'' in a def does not reach into a lambda written inside
	it -- the lambda's walrus binds a lambda-local and the module g is
	untouched."

	self assertAll: #('enclosing_global_stays_put')
%

category: 'Grail-Tests'
method: WalrusInLambdaTestCase
testParametersDefaultsAndVarargs
	"A walrus target that IS a parameter must not be declared twice, and
	a default's walrus binds in the ENCLOSING scope -- Python evaluates
	defaults there, at definition time."

	self assertAll: #('with_a_parameter' 'rebinds_its_own_parameter'
		'in_a_default' 'varargs')
%

category: 'Grail-Tests'
method: WalrusInLambdaTestCase
testNestedScopes
	"A comprehension inside the lambda, a lambda inside the lambda, and
	the late-binding ``lambda i=i:'' idiom -- each of which reaches the
	scope walk by a different route."

	self assertAll: #('comprehension_in_a_lambda' 'lambda_in_a_lambda'
		'inner_lambda_closes_over_it' 'late_bound_in_a_comprehension')
%

category: 'Grail-Tests'
method: WalrusInLambdaTestCase
testTheOtherPlacesALambdaIsWritten
	"Module level and a class body.  The class body is the one that
	needed isVariableIsDeclared: -- its value emit consults that walk
	before falling back to a module lookup, so the read raised NameError
	at class-build time while the temp sat declared beside it."

	self assertAll: #('module_level' 'class_body' 'shadows_a_builtin')
%

category: 'Grail-Tests'
method: WalrusInLambdaTestCase
testTheBodyIsAnExpressionNotANamedexpr
	"``lambda: x := 1'' is refused, with CPython's wording -- except as
	the VALUE of a walrus, where the outer ``:='' has already claimed its
	right-hand side and CPython says plain ``invalid syntax''.  Those two
	are its own invalid_15 and invalid_14."

	self assertAll: #('body_refuses_a_bare_walrus'
		'body_refuses_it_as_a_statement' 'body_refuses_it_in_a_display'
		'as_a_walrus_value_it_is_plain_invalid_syntax'
		'parenthesised_in_the_body')
%
