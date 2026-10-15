Class {
	#name : 'PlainWithDoesNotAwaitTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - with' }
PlainWithDoesNotAwaitTestCase >> testEveryPlainWithCheckAgreesWithCPython [
	"Every check in tests/python/plain_with_does_not_await.py, which the fixture
	gate also runs under CPython 3.14.

	The names are listed rather than iterated so that a check DISAPPEARING
	fails too -- a fixture that stopped defining checks would otherwise pass
	this test with an empty loop."

	| fixture results names |

	importlib @env1:modules removeKey: #'plain_with_does_not_await' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/plain_with_does_not_await.py')
		name: 'plain_with_does_not_await'.
	results := fixture @env1:___pyAttrLoad___: #RESULTS.
	names := #('a_plain_manager_is_unchanged'
	  'an_enter_that_returns_a_coroutine_binds_it_unawaited'
	  'an_enter_that_returns_a_generator_binds_it_unrun'
	  'async_with_still_awaits_an_aenter_that_suspends'
	  'async_with_still_holds_a_contended_lock_across_the_body'
	  'closing_a_generator_binds_the_generator'
	  'nested_items_each_bind_their_own_value').
	names do: [:name |
		self
			assert: ((results @env1:__getitem__: name) = true)
			description: name , ' -> ' , (results @env1:__getitem__: name) printString].
	self assert: names size equals: 7

]
