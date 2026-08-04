! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassScopeComprehensionTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassScopeComprehensionTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
ClassScopeComprehensionTestCase comment:
'A comprehension (or lambda) in a class body does NOT see the class scope.

Python''s rule: a comprehension is its own function scope, and a CLASS scope is
not part of the enclosing-scope chain of a nested function.  So a free name read
inside one skips the class namespace and resolves in the module/global scope:

    y = 1
    class C:
        y = 2
        vals = [(x, y) for x in range(2)]      # CPython: [(0, 1), (1, 1)]

Grail read the class attribute and answered [(0, 2), (1, 2)], in BOTH the
module-compiled and the exec''d path.

The ONE exception is the OUTERMOST ITERABLE of the outermost comprehension:
CPython evaluates it in the ENCLOSING scope, which is exactly why
``[x for x in items]'' CAN see a sibling class attribute.  A later ``for''
clause''s iterable is already inside the comprehension and cannot.  Both halves
are asserted, because a fix that got only the first right would silently break
every ``[x for x in <class attr>]'' in a class body.

See tests/python/class_scope_comprehension.py.'
%

expectvalue /Class
doit
ClassScopeComprehensionTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
ClassScopeComprehensionTestCase removeAllMethods: 0.
ClassScopeComprehensionTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassScopeComprehensionTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_scope_comprehension' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_scope_comprehension.py')
		name: 'class_scope_comprehension'.
%

category: 'Grail-Helpers'
method: ClassScopeComprehensionTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Tests - Skips class scope'
method: ClassScopeComprehensionTestCase
testElementExpressionReadsTheModuleNotTheClass
	"The canonical case: a name that exists BOTH at module scope and as a class
	attribute must read the module's from a comprehension's element
	expression."

	self assert: (self resultAt: 'element_expr') equals: true
%

category: 'Grail-Tests - Skips class scope'
method: ClassScopeComprehensionTestCase
testConditionExpressionReadsTheModuleNotTheClass
	"An ``if'' clause is inside the comprehension scope too."

	self assert: (self resultAt: 'condition_expr') equals: true
%

category: 'Grail-Tests - Skips class scope'
method: ClassScopeComprehensionTestCase
testSecondForClauseIterableReadsTheModuleNotTheClass
	"Only the FIRST clause's iterable is evaluated in the enclosing scope; a
	later ``for''s iterable already runs inside the comprehension."

	self assert: (self resultAt: 'second_iterable') equals: true
%

category: 'Grail-Tests - Skips class scope'
method: ClassScopeComprehensionTestCase
testNestedComprehensionReadsTheModuleNotTheClass
	"A comprehension nested in another comprehension's element expression is
	two scopes away from the class body."

	self assert: (self resultAt: 'nested_comp') equals: true
%

category: 'Grail-Tests - Skips class scope'
method: ClassScopeComprehensionTestCase
testLambdaBodyReadsTheModuleNotTheClass
	"A lambda in a class body is a function scope by the same rule."

	self assert: (self resultAt: 'lambda_body') equals: true
%

category: 'Grail-Tests - Outermost iterable'
method: ClassScopeComprehensionTestCase
testOutermostIterableReadsTheClassAttribute
	"The exception to the rule, and the reason it must be preserved:
	``items = [...]'' then ``vals = [x * 10 for x in items]'' is the ordinary
	way a class body derives one attribute from another."

	self assert: (self resultAt: 'outermost_iterable') equals: true
%

category: 'Grail-Tests - Outermost iterable'
method: ClassScopeComprehensionTestCase
testOutermostIterableMayBeAnExpression
	"The whole iterable EXPRESSION is in the enclosing scope, not just a bare
	name -- the scope walk has to recognise being anywhere inside it."

	self assert: (self resultAt: 'outermost_expression') equals: true
%

category: 'Grail-Tests - Outermost iterable'
method: ClassScopeComprehensionTestCase
testOutermostSeesClassWhileElementDoesNot
	"Both halves in ONE comprehension, distinguished by value rather than by an
	error: the iterable resolves on the class, the element expression on the
	module."

	self assert: (self resultAt: 'outermost_vs_element') equals: true
%

category: 'Grail-Tests - Unaffected'
method: ClassScopeComprehensionTestCase
testPlainClassBodyReadsAreUnaffected
	"A class-body expression NOT inside a comprehension or lambda still reads
	sibling attributes -- that is the class scope doing its job."

	self assert: (self resultAt: 'plain_sibling_unaffected') equals: true
%

category: 'Grail-Tests - Unaffected'
method: ClassScopeComprehensionTestCase
testMethodBodiesAreUnaffected
	"A comprehension inside a METHOD reaches class attributes the normal Python
	way (through the class object)."

	self assert: (self resultAt: 'method_body_unaffected') equals: true
%

category: 'Grail-Tests - Equivalence'
method: ClassScopeComprehensionTestCase
testExecAgreesWithModuleCompilation
	"The same source answers the same thing compiled into a module class and
	into an exec doit -- the rule is applied in one place, so both paths move
	together."

	self assert: (self resultAt: 'exec_matches_module') equals: true
%
