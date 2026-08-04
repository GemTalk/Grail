! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExecClassBodyNamesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ExecClassBodyNamesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
ExecClassBodyNamesTestCase comment:
'Class-body sibling name reads when the class body is compiled in a DOIT.

exec("class C: ...") compiles the class body into a doit, not into a module
class.  NameAst''s whole class-body branch was gated on
``CallAst moduleClassBeingCompiled notNil'', because every fallback in it reads
the enclosing scope through ``<ModuleClass> @env0:___instance___''.  With no
module class the gate failed, the read fell through to the generic emits, and a
reference to a name bound earlier in the SAME class body came out as a bare
Smalltalk identifier.  The attribute lives on the class, not as a doit temp, so
the doit did not compile: ``CompileError 1001, undefined symbol items''.  That
was 10 of test_listcomps'' 42 remaining failures.

NOT asserted here: Python evaluates a comprehension''s OUTERMOST ITERABLE in the
enclosing (class) scope -- which is why it may see a class attribute -- while the
element expression and inner clauses run in the comprehension''s own scope and
SKIP class scope.  Grail does not implement that skip, identically in the module
path, so these tests pin exec/module EQUIVALENCE rather than the CPython value
for element-expression reads.  The fixture spells out both that deviation and one
shape where exec is now AHEAD of module compilation.

See tests/python/exec_classbody_names.py.'
%

expectvalue /Class
doit
ExecClassBodyNamesTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
ExecClassBodyNamesTestCase removeAllMethods: 0.
ExecClassBodyNamesTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: ExecClassBodyNamesTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'exec_classbody_names' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exec_classbody_names.py')
		name: 'exec_classbody_names'.
%

category: 'Grail-Helpers'
method: ExecClassBodyNamesTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Tests - Sibling reads'
method: ExecClassBodyNamesTestCase
testPlainSiblingAttributeRead
	"``a = 5'' then ``b = a + 1'' in an exec'd class body."

	self assert: (self resultAt: 'plain_sibling') equals: true
%

category: 'Grail-Tests - Sibling reads'
method: ExecClassBodyNamesTestCase
testComprehensionOutermostIterableReadsASibling
	"``items = [1, 2]'' then ``y = [x for x in items]'' -- the exact shape
	behind ``undefined symbol items''.  The outermost iterable is the one
	position Python DOES evaluate in the class scope."

	self assert: (self resultAt: 'outermost_iterable') equals: true
%

category: 'Grail-Tests - Sibling reads'
method: ExecClassBodyNamesTestCase
testLambdaInAComprehensionReadsASibling
	"test_listcomps' test_lambdas_with_free_var shape: build lambdas in one
	class attribute, call them from the next."

	self assert: (self resultAt: 'lambda_in_comprehension') equals: true
%

category: 'Grail-Tests - Sibling reads'
method: ExecClassBodyNamesTestCase
testNestedComprehensionOverASibling
	"test_nested_4's shape -- a comprehension whose iterable is a sibling
	holding tuples of lambdas."

	self assert: (self resultAt: 'nested_comprehension') equals: true
%

category: 'Grail-Tests - Sibling reads'
method: ExecClassBodyNamesTestCase
testSiblingMethodReference
	"A class-body reference to a sibling ``def'' -- a receiver-less
	BoundMethod, which needs no module instance."

	self assert: (self resultAt: 'sibling_method') equals: true
%

category: 'Grail-Tests - Sibling reads'
method: ExecClassBodyNamesTestCase
testNestedClassSiblingReference
	"A nested class lives in the outer class's per-class dynamic store."

	self assert: (self resultAt: 'nested_class') equals: true
%

category: 'Grail-Tests - Unchanged paths'
method: ExecClassBodyNamesTestCase
testClassBodyStillReadsAnExecGlobal
	"A name that is NOT a class attribute still resolves in the exec
	namespace -- that path was never broken and must stay that way."

	self assert: (self resultAt: 'reads_exec_global') equals: true
%

category: 'Grail-Tests - Unchanged paths'
method: ExecClassBodyNamesTestCase
testClassAttributeShadowsAnExecGlobal
	"When both exist, Python reads the class-local."

	self assert: (self resultAt: 'attr_shadows_global') equals: true
%

category: 'Grail-Tests - Equivalence'
method: ExecClassBodyNamesTestCase
testExecAgreesWithModuleCompilation
	"The same source answers the same thing whether the class body compiles
	into a module class or into a doit.  Compared against real module-compiled
	classes in the fixture, so it stays honest where Grail deviates from
	CPython; the fixture answers a ``module X != exec Y'' list on a mismatch."

	self assert: (self resultAt: 'exec_matches_module') equals: true
%
