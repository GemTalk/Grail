"``await' enforces CPython's GET_AWAITABLE protocol.

Three clauses, in CPython's order: a coroutine or generator-shaped operand
is delegated to; anything with __await__ has it called and the RESULT
validated (a coroutine and a non-iterator are each their own TypeError,
coroutine checked FIRST because a Grail coroutine is iterator-shaped); and
everything else is ``TypeError: 'X' object can't be awaited'.

That third clause replaced a DELIBERATE, RECORDED pass-through: ``await 3'
answered 3, because jinja2, asgiref and flask awaited values Grail resolved
synchronously behind is_async guards that never fired.  The guards misfired
because the inspect predicates were stubs; honest predicates (PR #661)
retired the reason, and the canaries -- Flask 371, asgi 28, the full curated
corpus -- run clean strict.  The pin that recorded the deviation
(CoroutineSuspensionTestCase) moved to the strict answer with the change.

The leniency KEPT: a plain generator is accepted where CPython wants
CO_ITERABLE_COROUTINE, because types.coroutine is an identity decorator here
and the decorated case cannot be told from the undecorated one.

``async with' rejects a non-awaitable __aenter__ / __aexit__ RESULT with
its own wording, naming the method it came from -- by the __aexit__ case the
body has already run.  WithAst grew per-site prefixes for exactly that
(___enterAwaitPrefix___ / ___exitAwaitPrefix___); the sync ``with' path is
untouched, still driven through the class-side pass-through helper.

See tests/python/await_protocol.py (14 checks, CPython-validated first)."
Class {
	#name : 'AwaitProtocolTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
AwaitProtocolTestCase >> assertAll: keys [
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]

]

{ #category : 'Grail-Helpers' }
AwaitProtocolTestCase >> resultAt: aKey [
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
AwaitProtocolTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'await_protocol' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/await_protocol.py')
		name: 'await_protocol'.

]

{ #category : 'Grail-Tests - async with' }
AwaitProtocolTestCase >> testAsyncWithNamesTheMethod [
	"A non-awaitable __aenter__ / __aexit__ result is rejected naming the
	method it came from -- and in the __aexit__ case the body has already
	run, which the fixture asserts alongside the message."

	self assertAll: #('async_with_sync_aenter_is_typeerror'
		'async_with_sync_aexit_is_typeerror_after_body'
		'async_with_real_manager_still_works')

]

{ #category : 'Grail-Tests - clause two' }
AwaitProtocolTestCase >> testAwaitResultsAreValidated [
	"__await__'s RESULT: a coroutine and a non-iterator each get CPython's
	own message; an iterator is driven."

	self assertAll: #('await_dunder_returning_none_is_typeerror'
		'await_dunder_returning_list_is_typeerror'
		'await_dunder_returning_coroutine_is_typeerror'
		'await_dunder_returning_iterator_is_driven')

]

{ #category : 'Grail-Tests - clause three' }
AwaitProtocolTestCase >> testNonAwaitablesAreRejectedByName [
	"'X' object can't be awaited -- the clause that replaced the pass-through."

	self assertAll: #('await_int_is_typeerror' 'await_list_is_typeerror'
		'await_none_is_typeerror' 'await_plain_instance_is_typeerror')

]

{ #category : 'Grail-Tests - what must keep working' }
AwaitProtocolTestCase >> testTheWorkingPathsStillWork [
	"The suspension handshake (an __await__ that yields parks the whole
	coroutine and resumes with the sent value), an ordinary await of a
	coroutine, and a @types.coroutine generator."

	self assertAll: #('awaitable_suspension_still_propagates'
		'await_coroutine_still_works'
		'await_types_coroutine_generator_still_works')

]
