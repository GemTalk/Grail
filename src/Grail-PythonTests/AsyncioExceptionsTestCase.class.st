Class {
	#name : 'AsyncioExceptionsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
AsyncioExceptionsTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
AsyncioExceptionsTestCase >> setUp [
	"Reload the fixture fresh each test.  Its module body RUNS the checks --
	two of them drive a real event loop through asyncio.run -- so a shared
	instance would let one test observe another's loop state."

	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'asyncio_exceptions' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/asyncio_exceptions.py')
		name: 'asyncio_exceptions'.
	probe := testModule @env1:___pyAttrLoad___: #'r'

]

{ #category : 'Grail-Tests - CancelledError' }
AsyncioExceptionsTestCase >> testCancelledErrorIsAsynciosOwnAndNotAnException [
	"NOT aliased to anything, and outside Exception on purpose -- it moved out
	in 3.8 precisely so ordinary error handling cannot swallow cancellation."

	self assert: (self at: 'cancelled_error_is_asyncios_own') equals: true.

]

{ #category : 'Grail-Tests - CancelledError' }
AsyncioExceptionsTestCase >> testCancelledErrorPassesThroughExceptException [
	"The consequence, measured on a real task rather than asserted from the
	class hierarchy: a task body wrapping everything in ``except Exception''
	is still cancellable.  If CancelledError were an Exception this would
	answer 'swallowed' and cancellation would be unreliable in the most
	ordinary code there is."

	self
		assert: (self at: 'cancelled_error_survives_except_exception')
		equals: true.

]

{ #category : 'Grail-Tests - TimeoutError' }
AsyncioExceptionsTestCase >> testTimeoutErrorInheritsFromOSError [
	"The builtin descends from OSError; a bare Exception subclass does not.
	So ``except OSError'' around a timing-out await used to behave
	differently -- a second wrong answer from the same cause, and one no
	asyncio-specific test would have looked for."

	self assert: (self at: 'timeout_error_is_an_oserror') equals: true.

]

{ #category : 'Grail-Tests - TimeoutError' }
AsyncioExceptionsTestCase >> testTimeoutErrorIsTheBuiltin [
	"The identity, which is the whole of it.  Written as its own test rather
	than folded into the catch-site test below, because when this one fails the
	other two fail WITH it and only this one says why."

	self assert: (self at: 'timeout_error_is_the_builtin') equals: true.

]

{ #category : 'Grail-Tests - TimeoutError' }
AsyncioExceptionsTestCase >> testWaitForRaisesWhatTheBuiltinNameCatches [
	"The failure exactly as upstream reported it: catch the BUILTIN name
	around a wait_for that times out.  Before the alias this except clause
	did not fire at all and the exception escaped.

	The fixture times out on a future NOTHING resolves, so the check does not
	depend on how fast this machine is -- only that 0.01s passes."

	self
		assert: (self at: 'wait_for_raises_what_the_builtin_name_catches')
		equals: true.

]
