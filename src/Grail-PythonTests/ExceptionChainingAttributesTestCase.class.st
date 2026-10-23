"Assigning __cause__, __context__ and __suppress_context__ on an exception.

They are getset descriptors in CPython.  Grail stored an assignment as an
ordinary attribute named after the dunder -- a different slot from the one
``raise X from Y' writes -- so assigning the cause did not set
__suppress_context__, nothing was validated, all three could be deleted, and
pythonExceptionChain never saw an assigned cause.  BaseException >>
___pyAttrStore___:put: now routes them to their slots.

Every expectation in tests/python/exception_chaining_attributes.py was
produced by CPython 3.14; the fixture gate re-checks it there."
Class {
	#name : 'ExceptionChainingAttributesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ExceptionChainingAttributesTestCase >> assertAll: keys [
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]

]

{ #category : 'Grail-Helpers' }
ExceptionChainingAttributesTestCase >> resultAt: aKey [
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
ExceptionChainingAttributesTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'exception_chaining_attributes' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exception_chaining_attributes.py')
		name: 'exception_chaining_attributes'.

]

{ #category : 'Grail-Tests' }
ExceptionChainingAttributesTestCase >> testAPreExistingContextCycleDoesNotHangTheNextRaise [

	"A raise inside the handler of an exception whose context chain already
	loops -- ``ex.__context__ = ex'' -- hung the session: the walk that breaks a
	cycle through the NEW exception never ended on one that does not pass
	through it.  The three shapes are test_exceptions'
	test_no_hang_on_context_chain_cycle1..3."

	self assertAll: #('a_self_context_cycle_does_not_hang_the_next_raise'
		'a_cycle_through_the_raised_exception_is_broken_there'
		'a_longer_pre_existing_cycle_does_not_hang')

]

{ #category : 'Grail-Tests' }
ExceptionChainingAttributesTestCase >> testAssignedLinksAreNotInstanceAttributes [
	"The control (``raise X from Y'') and the storage: nothing lands in
	__dict__."

	self assertAll: #('assigned_links_are_not_instance_attributes' 'raise_from_still_chains')

]

{ #category : 'Grail-Tests' }
ExceptionChainingAttributesTestCase >> testAssigningTheCauseSuppressesTheContext [
	"Every store route sets the flag, and a cleared cause keeps the context
	hidden -- in the attribute and in the rendered traceback."

	self assertAll: #('assigning_the_cause_suppresses_the_context'
		'every_store_route_sets_the_flag' 'a_cleared_cause_keeps_the_context_hidden')

]

{ #category : 'Grail-Tests' }
ExceptionChainingAttributesTestCase >> testPythonExceptionChainSeesAnAssignedCause [
	"The embedding walk reads the ___cause___ slot.  An assigned cause used to
	live in an attribute named __cause__ instead, so the walk answered an empty
	chain for an exception Python code reported as caused."

	| exc chain |
	exc := (testModule @env1:___pyAttrLoad___: #assigned_cause_exception)
		@env1:value: { } value: nil.
	chain := exc pythonExceptionChain.
	self assert: chain size = 1.
	self assert: (chain first at: 2) == #cause.
	self assert: (chain first at: 1) class name == #KeyError

]

{ #category : 'Grail-Tests' }
ExceptionChainingAttributesTestCase >> testStoresAreValidated [
	"None or an exception instance for the links, a real bool for the flag, and
	no deletes."

	self assertAll: #('links_must_be_exception_instances'
		'suppress_context_takes_only_a_bool' 'chaining_attributes_cannot_be_deleted')

]
