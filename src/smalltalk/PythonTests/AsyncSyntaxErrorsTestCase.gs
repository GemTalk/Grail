! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'AsyncSyntaxErrorsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
AsyncSyntaxErrorsTestCase comment:
'Parse-time SyntaxErrors for misplaced async constructs.

CPython raises these from the compiler''s symbol pass, not the grammar;
Grail''s parser accepted them all and compiled working code (the
AsyncWithAst comment recorded the leniency).  The placement walk
ModuleAst class>>___validateAsyncPlacement___:scope: now runs after every
parse -- one choke point, so import, exec, eval and compile all refuse
alike -- with CPython''s wording for the two messages test_asyncgen
regex-matches: ``''yield from'' inside async function'' and ``''return''
with value in async generator''.

The scope walk mirrors evaluation time, and the legal side of the fixture
pins the subtle attributions: a generator expression is an
async-PERMISSIVE scope of its own (PEP 530 -- await and async-for are
legal there even inside a sync def, which test_asyncgen''s expression_02
depends on), a def''s decorators and parameter defaults belong to the
ENCLOSING scope, a nested sync def resets the colour, and a bare return
in an async generator stays legal.  Two token-level rules ride along in
the parser proper: await''s operand may not be another bare await, and an
import alias must be a NAME.

See tests/python/async_syntax_errors.py (22 checks, CPython-validated
first).'
%

expectvalue /Class
doit
AsyncSyntaxErrorsTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
AsyncSyntaxErrorsTestCase removeAllMethods: 0.
AsyncSyntaxErrorsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: AsyncSyntaxErrorsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'async_syntax_errors' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/async_syntax_errors.py')
		name: 'async_syntax_errors'.
%

category: 'Grail-Helpers'
method: AsyncSyntaxErrorsTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: AsyncSyntaxErrorsTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: AsyncSyntaxErrorsTestCase
testTheAsyncGenMessages
	"The four AsyncGenSyntaxTest shapes, wording exact: yield-from in any
	async def, valued return once a yield (even a dead one) makes it an
	async generator."

	self assertAll: #('yield_from_in_async_def' 'yield_from_after_await'
		'return_value_in_async_gen'
		'return_value_dead_yield_still_makes_async_gen')
%

category: 'Grail-Tests'
method: AsyncSyntaxErrorsTestCase
testPlacementRefusals
	"await outside an async scope -- module, sync def, lambda, nested sync
	def, a default (enclosing scope) -- and async for / async with / an
	async comprehension in a sync def, plus the two token-level rules."

	self assertAll: #('await_at_module_level' 'await_in_sync_def'
		'await_in_lambda_inside_async_def' 'await_in_nested_sync_def'
		'await_in_default_of_async_def' 'async_for_in_sync_def'
		'async_with_in_sync_def' 'async_listcomp_in_sync_def'
		'await_await' 'import_as_keyword')
%

category: 'Grail-Tests'
method: AsyncSyntaxErrorsTestCase
testWhatStaysLegal
	"The refusals must not overreach: genexps are async-permissive inside
	sync defs, nested sync defs reset the colour, bare return in an async
	generator and valued return in a plain coroutine survive, and the
	parenthesised await-await spelling is the legal one."

	self assertAll: #('bare_return_in_async_gen'
		'return_value_in_plain_coroutine' 'genexp_await_inside_sync_def'
		'genexp_async_for_inside_sync_def' 'nested_sync_gen_resets_colour'
		'parenthesised_await_await' 'decorator_before_async_def'
		'class_body_inside_async_def')
%
