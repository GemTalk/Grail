! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'DelegationIntrospectionTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
DelegationIntrospectionTestCase comment:
'cr_await / gi_yieldfrom / ag_await: the delegation chain, made visible.

___yieldFrom___: records its target (the delegationTarget instVar, cleared
at normal completion; abnormal exits leave it stale but INVISIBLE, because
every abnormal route marks the generator done and the accessors gate on
that).  The three spellings read it back with CPython''s gates, measured:

  * cr_await -- the awaited object while PARKED mid-await, None while the
    body executes.  test_cr_await asserts both, including the full chain
    coro_b.cr_await.cr_await.gi_code.co_name -- which is why this needed
    the real code objects (#667) and the real delegation (#659''s era)
    before it could exist.
  * gi_yieldfrom -- the sub-iterator BY IDENTITY while suspended inside a
    yield-from; None fresh, running, finished, or parked at a PLAIN yield
    (the staleness case clearing-at-completion guards).
  * ag_await -- the whole asend-in-flight window, running included; and
    ag_running is now CPython''s ag_running_async (the asendOwner window),
    so mid-await the state reads AGEN_RUNNING, as upstream.

See tests/python/delegation_introspection.py (5 checks, CPython-validated
first).'
%

expectvalue /Class
doit
DelegationIntrospectionTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
DelegationIntrospectionTestCase removeAllMethods: 0.
DelegationIntrospectionTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: DelegationIntrospectionTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'delegation_introspection' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/delegation_introspection.py')
		name: 'delegation_introspection'.
%

category: 'Grail-Helpers'
method: DelegationIntrospectionTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: DelegationIntrospectionTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: DelegationIntrospectionTestCase
testTheCoroutineChain
	"Parked: the b -> c -> nop chain by type and code name.  Executing:
	None.  Fresh and closed: None."

	self assertAll: #('the_chain_while_suspended' 'fresh_and_closed_are_none')
%

category: 'Grail-Tests'
method: DelegationIntrospectionTestCase
testYieldfromAndAgAwait
	"gi_yieldfrom by identity, the plain-yield staleness guard, and
	ag_await/ag_running through CPython's running window."

	self assertAll: #('gi_yieldfrom_is_the_inner_by_identity'
		'a_plain_yield_park_after_a_delegation_shows_none'
		'ag_await_through_the_running_window')
%
