! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'InspectAsyncPredicatesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
InspectAsyncPredicatesTestCase comment:
'inspect''s async-function predicates: CPython''s mask, honest at last.

iscoroutinefunction / isgeneratorfunction / isasyncgenfunction are one rule
in CPython: unwrap a method to its function and a partial to its target,
then mask the code object''s co_flags.  Grail''s flags word is real
(FunctionDefAst >> emitCoFlags), so the predicates are now that same rule.

They were deliberate stubs for a RECORDED reason: the honest mask once hung
``import django.http.response'' indefinitely -- asgiref looped when told the
truth, measured as a 601-second timeout where test___all__ normally takes
22 seconds, and written up in docs/Issues.md.  Unstubbed only after
re-measuring: the import completes, test___all__ holds 23 seconds, the loop
having been fixed from underneath by this month''s callable-classification
work.  The lesson kept in the issue file: a stub can outlive its reason.

The foundation matters beyond inspect: vendored asyncio re-exports these
predicates as its own public API, @deprecated''s coroutine handling keys off
them, and DeprecatedTests.test_inspect in test_warnings passes from this
alone.  The runtime semantics of test_coroutines / test_asyncgen are a
separate, larger campaign -- measured: the predicates moved them barely,
because their failures are event-loop machinery, not introspection.

See tests/python/inspect_async_predicates.py.'
%

expectvalue /Class
doit
InspectAsyncPredicatesTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
InspectAsyncPredicatesTestCase removeAllMethods: 0.
InspectAsyncPredicatesTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: InspectAsyncPredicatesTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'inspect_async_predicates' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/inspect_async_predicates.py')
		name: 'inspect_async_predicates'.
%

category: 'Grail-Helpers'
method: InspectAsyncPredicatesTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: InspectAsyncPredicatesTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests - the truth table'
method: InspectAsyncPredicatesTestCase
testEveryDefKindClassifies
	self assertAll: #('an_async_def_is_a_coroutine_function'
		'a_plain_def_is_none_of_them'
		'a_yielding_def_is_a_generator_function'
		'an_async_yielding_def_is_an_async_generator_function'
		'a_non_callable_is_quietly_false')
%

category: 'Grail-Tests - the truth table'
method: InspectAsyncPredicatesTestCase
testMethodsAndPartialsUnwrap
	"CPython''s _has_code_flag walks __func__ off a method and func off a
	partial before masking; both shapes answer as their target does."

	self assertAll: #('an_async_method_read_via_the_class'
		'an_async_method_bound_to_an_instance'
		'a_generator_method_bound_to_an_instance'
		'a_partial_is_unwrapped_to_its_target')
%

category: 'Grail-Tests - the truth table'
method: InspectAsyncPredicatesTestCase
testTheMarkerStillWins
	"asgiref''s SyncToAsync marks itself; the marker is independent of the
	flags and must survive the unstubbing."

	self assertAll: #('the_explicit_marker_still_wins')
%

category: 'Grail-Tests - objects and the landmine'
method: InspectAsyncPredicatesTestCase
testObjectPredicatesAgree
	self assertAll: #('the_object_predicates_agree')
%

category: 'Grail-Tests - objects and the landmine'
method: InspectAsyncPredicatesTestCase
testTheRecordedLandmineStaysDefused
	"The import that hung >6 minutes with an honest predicate.  Under Grail
	this exercises the real vendored django/asgiref path; what it must never
	do is hang."

	self assertAll: #('django_http_response_imports_with_honest_predicates')
%
