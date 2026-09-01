! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'GenexpLazinessTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
GenexpLazinessTestCase comment:
'A generator expression is LAZY, and Grail materialised it into a list.

``(f(x) for x in src)'' runs nothing until the first ``next''.  Grail
built the whole sequence at construction and answered an
OrderedCollection -- right for every consumer that drains it anyway
(``sum'', ``list'', ``for x in ...''), which is most of them, and wrong
for every consumer that does not:

  * ``any(p(x) for x in xs)'' ran p over ALL of xs instead of stopping
    at the first true one -- so a walrus in the element expression came
    back holding the LAST value rather than the matching one;
  * a genexp over an unbounded source could not be written at all;
  * ``type((x for x in [1]))'' answered ``list'';
  * construction consumed a one-shot iterator to exhaustion;
  * send / throw / close were absent.

Generator FUNCTIONS were already lazy: ``def gf(): yield x'' emits
``PythonGenerator withBlock:''.  So was the ASYNC expression form,
which was given a real PythonAsyncGenerator when async iteration became
real and a list stopped being acceptable.  Only the SYNCHRONOUS
expression materialised, and GeneratorExpAst said so in its own
comment: a long-standing approximation whose blast radius is every
genexp in the corpus, left alone deliberately so that correcting it
would be its own change rather than a side effect of async work.

It now emits the same shape as its async sibling -- PythonGenerator
withBlock:, ___yield___: per element, the outermost iterable bound AND
__iter__''d in a wrapper block at construction, which is CPython''s rule
and what makes ``(x for x in None)'' raise from the enclosing statement
rather than from the first next().

Took test.test_named_expressions 6 -> 4 (scope_03 and scope_in_genexp,
both of which turn on the walrus binding as the genexp is consumed
rather than all at once).  A name-level diff of all 102 suite modules
against the parent showed those two tests and nothing else, in either
direction.

See tests/python/genexp_laziness.py (22 checks, CPython-validated
first).'
%

expectvalue /Class
doit
GenexpLazinessTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
GenexpLazinessTestCase removeAllMethods: 0.
GenexpLazinessTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: GenexpLazinessTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'genexp_laziness' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/genexp_laziness.py')
		name: 'genexp_laziness'.
%

category: 'Grail-Helpers'
method: GenexpLazinessTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: GenexpLazinessTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: GenexpLazinessTestCase
testNothingRunsUntilTheFirstNext
	"The whole claim, in two checks: constructing a genexp evaluates no
	element and consumes no item of its source."

	self assertAll: #('construction_runs_nothing'
		'consumes_the_source_one_at_a_time')
%

category: 'Grail-Tests'
method: GenexpLazinessTestCase
testAShortCircuitingConsumerStopsEarly
	"``any''/``all'' are the shapes that made the old behaviour visible
	as a WRONG ANSWER rather than as wasted work -- a walrus in the
	element expression came back holding the last value, not the
	matching one (test_named_expressions scope_03)."

	self assertAll: #('any_short_circuits' 'all_short_circuits'
		'next_with_a_default')
%

category: 'Grail-Tests'
method: GenexpLazinessTestCase
testAnUnboundedSourceIsFine
	"Not slow before -- impossible.  A genexp over an endless generator
	drained it at construction."

	self assertAll: #('unbounded_source' 'unbounded_with_a_filter')
%

category: 'Grail-Tests'
method: GenexpLazinessTestCase
testItIsAGeneratorWithAGeneratorsProtocol
	"Identity as well as behaviour: the type name, iter(g) is g, one
	exhaustion only, and send / throw / close."

	self assertAll: #('type_name' 'is_its_own_iterator' 'exhausts_once'
		'has_generator_protocol' 'close_stops_it')
%

category: 'Grail-Tests'
method: GenexpLazinessTestCase
testTheOutermostIterableIsStillEager
	"The one part that is NOT lazy, and it matters twice: the outer
	source is bound at construction, so rebinding the name afterwards
	changes nothing, and its __iter__ runs there too -- which is why
	``(x for x in None)'' raises from the enclosing statement.  Inner
	iterables are evaluated per pass, as CPython does."

	self assertAll: #('outer_iterable_is_bound_eagerly'
		'outer_iterable_errors_at_construction' 'inner_iterable_is_not')
%

category: 'Grail-Tests'
method: GenexpLazinessTestCase
testAWalrusBindsAsTheGenexpIsConsumed
	"CPython's own test_named_expressions scope_03 and scope_in_genexp:
	the binding goes to the ENCLOSING scope, but not until the element
	that performs it is produced."

	self assertAll: #('walrus_binds_as_it_goes'
		'walrus_not_bound_before_iteration')
%

category: 'Grail-Tests'
method: GenexpLazinessTestCase
testTheConsumersThatAlwaysWorkedStillDo
	"Draining consumers were right under the old emission and are the
	overwhelming majority of genexp uses -- this is the regression half
	of the fixture."

	self assertAll: #('drained_by_sum' 'drained_by_list'
		'drained_by_a_for_loop' 'nested_genexps'
		'as_a_sole_call_argument')
%
