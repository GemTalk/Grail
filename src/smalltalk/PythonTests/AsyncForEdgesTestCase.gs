! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'AsyncForEdgesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
AsyncForEdgesTestCase comment:
'async-for edges: exhaustion placement, unpack protocol, invalid __anext__,
and PEP 530''s real genexp rule.

PLACEMENT.  A loop ends only when StopIteration / StopAsyncIteration comes
from the STEP.  The same exception from the iterable''s __iter__, the
target STORE, or the BODY propagates -- Grail''s loop emission used to wrap
all of it in one handler.  The step alone is now guarded
(ForAst >> ___drainGuardedStepFor___:, and the twin guard in
ComprehensionAst) and re-signals the internal PythonLoopDrained the
loop-level handler catches, so for-else and break placement are untouched.

ESCAPE.  A StopAsyncIteration escaping an async generator BODY converts as
CPython converts it -- RuntimeError(''async generator raised
StopAsyncIteration'') with the escaped exception as __cause__
(PythonAsyncGenerator >> _signalEscapedException, PEP 479''s async twin).

UNPACK.  CPython''s UNPACK_SEQUENCE is defined by ITERATION; a
non-subscriptable item is materialised through the iterator protocol first
(PythonCoroutine class >> ___unpackNormalize___:), so a dict item unpacks
to its KEYS and a raising __iter__ surfaces its own exception.

INVALID __anext__.  An __anext__ result whose __await__ RAISES gets the
same TypeError as one without __await__, the real error chained as
__cause__ (___grailAwaitAnext___:).

GENEXPS.  PEP 530''s rule is wider than the clauses: a genexp containing
``async for'' or ``await'' anywhere in its OWN scope -- nested list
comprehensions included, nested genexps excluded -- is an async generator
(GeneratorExpAst >> ___isAsyncGenexp___).  And the outermost iterable is
evaluated AT CREATION, bound into a wrapper-block parameter, because a lazy
generator reading a loop variable at first drive reads it too late.

See tests/python/async_for_edges.py (14 checks, CPython-validated first).'
%

expectvalue /Class
doit
AsyncForEdgesTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
AsyncForEdgesTestCase removeAllMethods: 0.
AsyncForEdgesTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: AsyncForEdgesTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'async_for_edges' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/async_for_edges.py')
		name: 'async_for_edges'.
%

category: 'Grail-Helpers'
method: AsyncForEdgesTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: AsyncForEdgesTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests - placement'
method: AsyncForEdgesTestCase
testOnlyTheStepEndsALoop
	"Store, body, and __iter__ exceptions propagate on both the sync and
	async sides; for-else and break keep their placement."

	self assertAll: #('async_store_exception_propagates'
		'async_listcomp_store_exception_propagates'
		'sync_store_exception_propagates' 'sync_body_exception_propagates'
		'sync_dunder_iter_exception_propagates'
		'for_else_and_break_are_placement_compatible')
%

category: 'Grail-Tests - placement'
method: AsyncForEdgesTestCase
testAnEscapedStopAsyncIterationConverts
	"PEP 479's async twin: RuntimeError with the escapee as __cause__."

	self assertAll: #('escaped_stopasynciteration_becomes_runtimeerror')
%

category: 'Grail-Tests - unpack'
method: AsyncForEdgesTestCase
testUnpackIsDefinedByIteration
	self assertAll: #('unpack_of_a_non_subscriptable_iterable'
		'unpack_of_a_dict_item_gives_keys'
		'unpack_surfaces_the_items_own_error')
%

category: 'Grail-Tests - anext and genexps'
method: AsyncForEdgesTestCase
testARaisingAwaitIsWrappedWithCause
	self assertAll: #('raising_dunder_await_is_wrapped_with_cause')
%

category: 'Grail-Tests - anext and genexps'
method: AsyncForEdgesTestCase
testPep530GenexpRule
	"Async by containment (nested listcomp counts, nested genexp does not),
	and the outermost iterable captured at creation."

	self assertAll: #('genexp_with_async_elt_is_an_async_generator'
		'outermost_iterable_is_captured_at_creation'
		'a_nested_genexp_does_not_leak_asynchrony_outward')
%
