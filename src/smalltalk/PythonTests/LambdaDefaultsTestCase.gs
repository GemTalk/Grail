! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for LambdaDefaultsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'LambdaDefaultsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
LambdaDefaultsTestCase comment:
'Lambda parameter binding: defaults, keyword matching, keyword-only args.

LambdaAst used to bind every named parameter with a bare ``positional at: i'',
so any argument the caller did not pass POSITIONALLY indexed past the end of
the array and raised a Smalltalk OffsetError (error 2003) -- uncatchable from
Python and fatal to the whole module load.  ``(lambda x=1: x)()'' and
``(lambda x: x)(x=5)'' both hit it, which made ``lambda n=i: ...'' -- the
standard by-value loop-variable capture -- unusable.

Defaults are now evaluated ONCE, at definition time, in the ENCLOSING scope
(an immediately-invoked outer block holding one temp per default, named by the
lambda''s source position so nested definers can reuse a parameter name).  That
single mechanism is what gives loop capture, single evaluation, shared mutable
defaults, and ``X=X'' enclosing-scope capture.

See tests/python/lambda_defaults.py for the fixture behind each test.'
%

expectvalue /Class
doit
LambdaDefaultsTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
LambdaDefaultsTestCase removeAllMethods: 0.
LambdaDefaultsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: LambdaDefaultsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'lambda_defaults' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/lambda_defaults.py')
		name: 'lambda_defaults'.
%

category: 'Grail-Helpers'
method: LambdaDefaultsTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Tests - Binding'
method: LambdaDefaultsTestCase
testPositionalDefaults
	"``lambda x=1: x'' called with no arguments used the default instead of
	indexing past the end of the positional array."

	self assert: (self resultAt: 'positional_defaults') equals: true
%

category: 'Grail-Tests - Binding'
method: LambdaDefaultsTestCase
testNamedParametersBindByKeyword
	"``(lambda x: x)(x=5)'' crashed just as hard as a missing default did --
	lambdas ignored the keyword dict entirely for named parameters."

	self assert: (self resultAt: 'keyword_matching') equals: true
%

category: 'Grail-Tests - Binding'
method: LambdaDefaultsTestCase
testMissingArgumentRaisesACatchableTypeError
	"The point of the fix: a genuinely missing argument is a Python TypeError,
	not a Smalltalk OffsetError that no ``except'' can see and that takes the
	whole module load down with it."

	self assert: (self resultAt: 'missing_argument') equals: true
%

category: 'Grail-Tests - Binding'
method: LambdaDefaultsTestCase
testKeywordOnlyArgs
	"``lambda *, k=3: k'' and ``lambda *a, k=1: ...'' -- keyword-only
	parameters bind from the kwargs dict, else their default, else TypeError."

	self assert: (self resultAt: 'keyword_only') equals: true
%

category: 'Grail-Tests - Binding'
method: LambdaDefaultsTestCase
testStarArgsIsATuple
	"``*args'' was an Array, so isinstance(a, tuple) was False and
	``a + (3,)'' failed; splatting it back out worked, which is why the
	werkzeug proxy lambdas never noticed."

	self assert: (self resultAt: 'star_args_tuple') equals: true
%

category: 'Grail-Tests - Binding'
method: LambdaDefaultsTestCase
testKwargsExcludesBoundParameters
	"Python's ``**kwargs'' collects only the keywords that matched no named
	parameter.  Now that named parameters bind from the dict, they must be
	removed from it -- and the caller's dict must not be mutated."

	self assert: (self resultAt: 'kwargs_excludes_bound') equals: true
%

category: 'Grail-Tests - Definition-time evaluation'
method: LambdaDefaultsTestCase
testLoopVariableCapture
	"THE idiom the crash made unusable: ``lambda n=i: n'' inside a loop
	freezes i as it is now, so the three closures answer 0, 1, 2."

	self assert: (self resultAt: 'loop_capture') equals: true
%

category: 'Grail-Tests - Definition-time evaluation'
method: LambdaDefaultsTestCase
testDefaultIsEvaluatedOnce
	"Python evaluates a default when the lambda is CREATED, not per call --
	so a side-effecting default expression runs exactly once."

	self assert: (self resultAt: 'evaluated_once') equals: true
%

category: 'Grail-Tests - Definition-time evaluation'
method: LambdaDefaultsTestCase
testMutableDefaultIsSharedAcrossCalls
	"The corollary, and the one Python is famous for: a mutable default is one
	object shared by every call, so successive calls see 1, 2, 3."

	self assert: (self resultAt: 'mutable_shared') equals: true
%

category: 'Grail-Tests - Scope'
method: LambdaDefaultsTestCase
testDefaultReadsTheEnclosingScope
	"``lambda missing=missing: missing'' -- the default must see the ENCLOSING
	binding even though the parameter shadows that name in the body.  It used
	to resolve as a read of the lambda's own parameter and land in the
	definition-time outer block where no such temp exists: CompileError 1001,
	``undefined symbol missing''."

	self assert: (self resultAt: 'enclosing_scope') equals: true
%

category: 'Grail-Tests - Scope'
method: LambdaDefaultsTestCase
testNestedDefinersMayReuseAParameterName
	"Default temps are named by the lambda's SOURCE POSITION, so a lambda
	nested in a def -- or in another lambda -- that defaults the same
	parameter name does not redeclare the enclosing temp (a Smalltalk compile
	error, not shadowing)."

	self assert: (self resultAt: 'nested_same_name') equals: true
%

category: 'Grail-Tests - Scope'
method: LambdaDefaultsTestCase
testDefaultStillSeesEnclosingFunctionLocals
	"The parameter-list hop skips ONLY the lambda it climbed out of, so a
	default expression still reads an enclosing def's locals."

	self assert: (self resultAt: 'enclosing_function_local') equals: true
%

category: 'Grail-Tests - Unchanged shapes'
method: LambdaDefaultsTestCase
testReservedNameParameters
	"``self''/``super'' are Smalltalk pseudo-variables, transported as
	``_<name>''.  The keyword LOOKUP uses the Python name, so ``self=7''
	still binds."

	self assert: (self resultAt: 'reserved_names') equals: true
%

category: 'Grail-Tests - Unchanged shapes'
method: LambdaDefaultsTestCase
testNoParametersAndPureStarForms
	"The forms that already worked -- no parameters at all, and the
	``*args''/``**kwargs'' proxy-forwarding shape werkzeug.local relies on."

	self assert: (self resultAt: 'no_params_and_stars') equals: true
%
