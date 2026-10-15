Class {
	#name : 'AsyncWithProtocolTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
AsyncWithProtocolTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
AsyncWithProtocolTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'async_with_protocol' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/async_with_protocol.py')
		name: 'async_with_protocol'.

]

{ #category : 'Grail-Tests - The protocol runs' }
AsyncWithProtocolTestCase >> testAenterAndAexitRunInOrder [
	"__aenter__ is awaited, its value binds the ``as'' target, and __aexit__ is
	awaited with a clean (None, None, None) when the body completes."

	self assert: (self resultAt: 'ok_result') asString equals: 'None'.
	self assert: (self resultAt: 'ok_order') asString
		equals: '[''enter'', ''body:resource'', ''exit:None'']'.

]

{ #category : 'Grail-Tests - The protocol runs' }
AsyncWithProtocolTestCase >> testAexitCanSuppressTheException [
	"A truthy __aexit__ swallows the exception and execution continues after the
	block -- awaited, so a coroutine __aexit__ returning True is recognised as
	True rather than as a coroutine object."

	self assert: (self resultAt: 'aexit_can_suppress') asString equals: '''continued'''.

]

{ #category : 'Grail-Tests - Protocol errors' }
AsyncWithProtocolTestCase >> testAMissingHalfNamesTheAsynchronousProtocol [
	"Each names the ASYNCHRONOUS protocol and the ``a''-prefixed method.  Note
	``Neither'' reports __aexit__, not __aenter__: a missing exit is reported
	first, the same order CPython uses synchronously."

	self assert: (self resultAt: 'lacks_aenter_msg') asString
		equals: 'TypeError: ''LacksAEnter'' object does not support the asynchronous context manager protocol (missed __aenter__ method)'.
	self assert: (self resultAt: 'lacks_aexit_msg') asString
		equals: 'TypeError: ''LacksAExit'' object does not support the asynchronous context manager protocol (missed __aexit__ method)'.
	self assert: (self resultAt: 'neither_msg') asString
		equals: 'TypeError: ''Neither'' object does not support the asynchronous context manager protocol (missed __aexit__ method)'.

]

{ #category : 'Grail-Tests - The protocol runs' }
AsyncWithProtocolTestCase >> testAnExceptionReachesAexitAndPropagates [
	self assert: (self resultAt: 'exception_propagates') asString
		equals: '''ValueError: x'''.
	self assert: (self resultAt: 'exception_order') asString
		equals: '[''enter'', ''exit:ValueError'']'.

]

{ #category : 'Grail-Tests - Protocol errors' }
AsyncWithProtocolTestCase >> testASyncManagerSuggestsPlainWith [
	"The mirror of the hint added for the synchronous direction, and the case
	that was WRONG rather than merely misworded: this used to run __enter__ /
	__exit__ and succeed."

	self assert: (self resultAt: 'sync_manager_msg') asString
		equals: 'TypeError: ''SyncManager'' object does not support the asynchronous context manager protocol (missed __aexit__ method) but it supports the context manager protocol. Did you mean to use ''with''?'.

]
