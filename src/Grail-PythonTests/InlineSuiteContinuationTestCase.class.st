Class {
	#name : 'InlineSuiteContinuationTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
InlineSuiteContinuationTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
InlineSuiteContinuationTestCase >> setUp [
	"Reload tests/python/inline_suite_continuation.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'inline_suite_continuation' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/inline_suite_continuation.py')
		name: 'inline_suite_continuation'.

]

{ #category : 'Grail-Tests - Loops' }
InlineSuiteContinuationTestCase >> testAnInlineElseInsideALoopBody [
	"``else: break'' nested in a while body -- the exact shape pydoc.locate()
	uses, and the one that surfaced this."

	self assert: (self resultAt: 'inline_break') asString equals: '(3, 0)'.
	self assert: (self resultAt: 'pydoc_locate_shape') asString equals: '(''b'', 2)'.

]

{ #category : 'Grail-Tests - if' }
InlineSuiteContinuationTestCase >> testAnInlineIfSuiteCanBeFollowedByElif [
	self assert: (self resultAt: 'elif_chain') asString
		equals: '[''one'', ''two'', ''many'']'.

]

{ #category : 'Grail-Tests - if' }
InlineSuiteContinuationTestCase >> testAnInlineIfSuiteCanBeFollowedByElse [
	"Both spellings of the else body, because the BODY was never the problem
	and a test of only one would suggest it was."

	self assert: (self resultAt: 'if_else') asString equals: '(1, 2)'.
	self assert: (self resultAt: 'if_else_block') asString equals: '(1, 2)'.

]

{ #category : 'Grail-Tests - Loops' }
InlineSuiteContinuationTestCase >> testAnInlineLoopSuiteCanBeFollowedByElse [
	self assert: (self resultAt: 'for_else') asString equals: '[1, 2, ''done'']'.
	self assert: (self resultAt: 'while_else') asString equals: '[2, 1, ''done'']'.

]

{ #category : 'Grail-Tests - if' }
InlineSuiteContinuationTestCase >> testAnInlineSuiteWithNoContinuationStillEndsThere [
	"The lookahead restores its position when the keyword is absent, so an if
	with no else must not swallow the statement after it.  This is the case a
	careless ``skipNewlines'' before the check would break, and it would break
	silently -- the following statement would join the if's suite."

	self assert: (self resultAt: 'no_continuation') asString
		equals: '((''after'', 1), (''after'', None))'.

]

{ #category : 'Grail-Tests - Already worked' }
InlineSuiteContinuationTestCase >> testTheShapesThatAlreadyWorkedStillDo [
	"A BLOCK-bodied if with an inline else, and try/except with inline suites.
	These were the reason the gap was invisible: they are the same construct
	and they parsed."

	self assert: (self resultAt: 'block_if_inline_else') asString equals: '(1, 2)'.
	self assert: (self resultAt: 'try_except_inline') asString equals: '''caught'''.

]
