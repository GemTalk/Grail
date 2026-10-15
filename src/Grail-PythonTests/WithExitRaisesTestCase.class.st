Class {
	#name : 'WithExitRaisesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
WithExitRaisesTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
WithExitRaisesTestCase >> setUp [
	"Reload the fixture fresh each test: its module body runs every check at
	import, and two of them drive an event loop through asyncio.run, so a
	shared instance would let one test observe another's loop state."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'with_exit_raises' ifAbsent: [].
	probe := (importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/with_exit_raises.py')
		name: 'with_exit_raises') @env1:___pyAttrLoad___: #'r'

]

{ #category : 'Grail-Tests - A raising exit' }
WithExitRaisesTestCase >> testAnInnerRaisingExitReachesTheOuterManager [
	"``with A, B:'' where B's clean __exit__ raises.  That raise is now outside
	B's protection, so A sees it as a body exception and gets
	__exit__(RuntimeError, ...) -- which is what CPython does and what the
	nesting has to preserve, since the inner statement IS the outer one's body."

	self
		assert: (self at: 'an_inner_raising_exit_reaches_the_outer_manager')
		equals: true.

]

{ #category : 'Grail-Tests - A raising exit' }
WithExitRaisesTestCase >> testARaisingExitIsCalledOnce [
	"Both flavours, because the emit is shared: AsyncWithAst overrides only how
	the call is DRIVEN (___awaitPrefix___), not where it sits."

	self assert: (self at: 'a_raising_exit_is_called_once') equals: true.
	self assert: (self at: 'a_raising_aexit_is_called_once') equals: true.

]

{ #category : 'Grail-Tests - Unchanged paths' }
WithExitRaisesTestCase >> testASuppressingExitIsNotCalledAgain [
	"The path the guard exists for.  A truthy __exit__ swallows the body's
	exception, and the handler then falls off its end -- so the on:do: answers
	the handler's value rather than the ``true'' the protected block would have
	answered, and no clean call follows.  Get this wrong and every suppressing
	manager sees a spurious __exit__(None, None, None)."

	self assert: (self at: 'a_suppressing_exit_is_not_called_again') equals: true.

]

{ #category : 'Grail-Tests - Unchanged paths' }
WithExitRaisesTestCase >> testControlFlowOutOfTheBodyStillGetsTheCleanCall [
	"return / break / continue are GemStone signals under BaseException, so
	they land in the same handler an exception does -- and the with-statement
	contract says the manager sees a CLEAN triple and the signal continues to
	its real target.  The handler still makes that call itself, so these
	deliberately exercise the branch the fix did NOT move."

	self
		assert: (self at: 'a_return_out_of_the_body_gets_the_none_triple')
		equals: true.
	self
		assert: (self at: 'a_break_out_of_the_body_gets_the_none_triple')
		equals: true.
	self
		assert: (self at: 'a_continue_out_of_the_body_gets_the_none_triple')
		equals: true.

]

{ #category : 'Grail-Tests - Unchanged paths' }
WithExitRaisesTestCase >> testTheOrdinaryPathsStillCallExitExactlyOnce [
	"A clean body, a body that raises, and nested managers."

	self assert: (self at: 'a_clean_body_gets_the_none_triple') equals: true.
	self assert: (self at: 'a_body_exception_still_reaches_exit') equals: true.
	self assert: (self at: 'nested_managers_each_get_one_call') equals: true.

]

{ #category : 'Grail-Tests - A raising exit' }
WithExitRaisesTestCase >> testTheRaiseFromExitPropagates [
	"Moving the call out of the protected block is only correct if what it
	raises actually leaves the statement -- the with must not quietly become a
	handler for its own manager."

	self assert: (self at: 'the_raise_from_exit_propagates') equals: true.

]
