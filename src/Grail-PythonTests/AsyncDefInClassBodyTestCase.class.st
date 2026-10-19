Class {
	#name : 'AsyncDefInClassBodyTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
AsyncDefInClassBodyTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
AsyncDefInClassBodyTestCase >> setUp [
	"Reload tests/python/async_def_in_class_body.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'async_def_in_class_body' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/async_def_in_class_body.py')
		name: 'async_def_in_class_body'.

]

{ #category : 'Grail-Tests - The methods exist' }
AsyncDefInClassBodyTestCase >> testAnAsyncDefInAClassBodyIsAMethod [
	"The whole defect in one assertion: all three forms -- plain, @staticmethod
	and @classmethod -- were absent from the class entirely."

	self assert: (self resultAt: 'methods_exist') asString
		equals: '[True, True, True]'.

]

{ #category : 'Grail-Tests - with protocol' }
AsyncDefInClassBodyTestCase >> testAnAsyncManagerSuggestsAsyncWith [
	"The visible consequence in test_with, and the reason a silent drop is the
	worst failure mode: this hint was already written and correct, and simply
	had nothing to find.  CPython added it because the mistake is common."

	self assert: (self resultAt: 'async_manager_msg') asString
		equals: '''AsyncManager'' object does not support the context manager protocol (missed __exit__ method) but it supports the asynchronous context manager protocol. Did you mean to use ''async with''?'.

]

{ #category : 'Grail-Tests - The methods exist' }
AsyncDefInClassBodyTestCase >> testCallingAnAsyncMethodAnswersACoroutine [
	"Was a known gap here, now closed: an async body used to run to completion
	at the call and answer its value.  It answers a PythonCoroutine, and the
	body does not run until something drives it -- which is what let test_with's
	``do_async_with(obj).send(None)'' cases start running at all."

	self assert: (self resultAt: 'async_call_answers_a_coroutine') asString
		equals: '[True, True, True]'.

]

{ #category : 'Grail-Tests - The methods exist' }
AsyncDefInClassBodyTestCase >> testModuleLevelAsyncDefStillWorks [
	"REGRESSION GUARD.  Module scope was never broken -- the node is a plain
	FunctionDefAst there, so AsyncFunctionDefAst applies harmlessly -- and the
	fix must not take that away, since that is the case the parser test pins."

	self assert: (self resultAt: 'module_level_async_def') asString equals: 'True'.

]

{ #category : 'Grail-Tests - Class dict' }
AsyncDefInClassBodyTestCase >> testTheClassDictTellsTheAsyncKindsApart [
	"A plain async def is a function in the class dict, an async @staticmethod /
	@classmethod the descriptor object -- CPython's answer.  This was a recorded
	gap: all three were stored as a plain function, and before the type-name
	correction leaked the Smalltalk spelling 'UnboundMethod'."

	self assert: (self resultAt: 'async_kinds') asString
		equals: '[''function'', ''staticmethod'', ''classmethod'']'.

]

{ #category : 'Grail-Tests - with protocol' }
AsyncDefInClassBodyTestCase >> testThePlainProtocolMessagesAreUnchanged [
	"REGRESSION GUARD for the three messages that were already right.  The hint
	is appended only when BOTH async halves are present, so making them visible
	must not start decorating an ordinary non-manager.  Note CPython reports a
	missing __exit__ before a missing __enter__ -- its SETUP_WITH looks __exit__
	up first -- which is why ``Neither'' names __exit__."

	self assert: (self resultAt: 'lacks_exit_msg') asString
		equals: '''LacksExit'' object does not support the context manager protocol (missed __exit__ method)'.
	self assert: (self resultAt: 'lacks_enter_msg') asString
		equals: '''LacksEnter'' object does not support the context manager protocol (missed __enter__ method)'.
	self assert: (self resultAt: 'neither_msg') asString
		equals: '''Neither'' object does not support the context manager protocol (missed __exit__ method)'.

]

{ #category : 'Grail-Tests - The methods exist' }
AsyncDefInClassBodyTestCase >> testTheyAreVisibleToIntrospection [
	"Present by every route that should see them, not just getattr: a method
	that answers hasattr but is missing from dir() or __dict__ would still be
	invisible to inspect, pydoc and unittest discovery."

	self assert: (self resultAt: 'methods_in_dir') asString
		equals: '[True, True, True]'.
	self assert: (self resultAt: 'methods_in_class_dict') asString
		equals: '[''c'', ''m'', ''s'']'.

]
