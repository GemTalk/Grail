Class {
	#name : 'ClassBodySourceOrderTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassBodySourceOrderTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
ClassBodySourceOrderTestCase >> setUp [
	"Reload tests/python/class_body_source_order.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_source_order' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_body_source_order.py')
		name: 'class_body_source_order'.

]

{ #category : 'Grail-Tests - A statement runs before what reads it' }
ClassBodySourceOrderTestCase >> testALoopDefinesWhatALaterAttributeReads [
	"The shape test_enum's test_ignore is built out of: names no statement in
	the body mentions, written through vars() by a loop, then read by name."

	self assert: (self resultAt: 'loop_defines_then_read') asString equals: '(9, 5)'.

]

{ #category : 'Grail-Tests - Order is order, both ways' }
ClassBodySourceOrderTestCase >> testAStatementAfterAnAttributeIsNotPulledForward [
	"The check that this is an INTERLEAVE and not a blanket move to the front:
	the loop appends between the two attribute appends, not before both."

	self assert: (self resultAt: 'interleaved_order') asString
		equals: '(''first'', ''loop'', ''last'')'.

]

{ #category : 'Grail-Tests - A statement runs before what reads it' }
ClassBodySourceOrderTestCase >> testEveryCompoundStatementRunsInItsPlace [
	"``while'' / ``try'' / ``with'' / ``if'' / augmented assignment / a bare
	expression -- the whole set the trailing pass used to hold back.  Each binds
	a name that the attribute below it reads."

	self assert: (self resultAt: 'while_then_read') asString equals: '(3, 6)'.
	self assert: (self resultAt: 'try_then_read') asString equals: '''try/finally'''.
	self assert: (self resultAt: 'with_then_read') asString equals: '''entered'''.
	self assert: (self resultAt: 'if_then_read') asString equals: '''yes'''.
	self assert: (self resultAt: 'augassign_then_read') asString equals: '(42, 84)'.
	self assert: (self resultAt: 'bare_expr_then_read') asString equals: '7'.

]

{ #category : 'Grail-Tests - Order is order, both ways' }
ClassBodySourceOrderTestCase >> testTheLastWriteWinsWhicheverKindItIs [
	"A loop overwriting an earlier attribute, and an attribute overwriting what
	a loop left -- the same rule a pair of assignments follows.  With the loop
	pinned to the end, the second of these answered 'from-loop'."

	self assert: (self resultAt: 'loop_overwrites_attribute') asString
		equals: '''from-loop'''.
	self assert: (self resultAt: 'attribute_overwrites_loop') asString
		equals: '''from-attribute'''.

]
