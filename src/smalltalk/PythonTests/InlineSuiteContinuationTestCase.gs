! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for InlineSuiteContinuationTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'InlineSuiteContinuationTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
InlineSuiteContinuationTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! InlineSuiteContinuationTestCase
!
! A compound statement whose SUITE sits on the header line, followed by a
! continuation clause:
!
!     if x: a = 1
!     else: a = 2
!
! was a SyntaxError -- ``Unexpected token: KEYWORD else''.  Not because of the
! else BODY: the same failure came with an indented block after ``else:'', and
! ``elif'' failed too.  The header line is what decided it.  parseSimpleStatements
! leaves the trailing NEWLINE unconsumed, so a bare ``atKeyword: 'elif''' looked
! at that NEWLINE, found no continuation, and the clause fell out to statement
! level.
!
! WHY IT SURVIVED THIS LONG: parseTry met the same wall and
! atKeywordSkippingNewlines: was written for it -- a lookahead that consumes the
! intervening newlines only when the keyword really follows.  The conditional and
! loop statements never got it.  So ``try:'' and a BLOCK-bodied ``while'' with an
! inline else already worked while ``if'', ``elif'' and ``for'' did not, and the
! shapes that worked look exactly like the shapes that did not.
!
! Found by porting CPython's pydoc, whose locate() is written this way:
!
!     if nextmodule: module, n = nextmodule, n + 1
!     else: break
!
! Drives tests/python/inline_suite_continuation.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
InlineSuiteContinuationTestCase removeAllMethods.
InlineSuiteContinuationTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: InlineSuiteContinuationTestCase
setUp
	"Reload tests/python/inline_suite_continuation.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'inline_suite_continuation' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/inline_suite_continuation.py')
		name: 'inline_suite_continuation'.
%

category: 'Grail-Private'
method: InlineSuiteContinuationTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - if'
method: InlineSuiteContinuationTestCase
testAnInlineIfSuiteCanBeFollowedByElse
	"Both spellings of the else body, because the BODY was never the problem
	and a test of only one would suggest it was."

	self assert: (self resultAt: 'if_else') asString equals: '(1, 2)'.
	self assert: (self resultAt: 'if_else_block') asString equals: '(1, 2)'.
%

category: 'Grail-Tests - if'
method: InlineSuiteContinuationTestCase
testAnInlineIfSuiteCanBeFollowedByElif
	self assert: (self resultAt: 'elif_chain') asString
		equals: '[''one'', ''two'', ''many'']'.
%

category: 'Grail-Tests - if'
method: InlineSuiteContinuationTestCase
testAnInlineSuiteWithNoContinuationStillEndsThere
	"The lookahead restores its position when the keyword is absent, so an if
	with no else must not swallow the statement after it.  This is the case a
	careless ``skipNewlines'' before the check would break, and it would break
	silently -- the following statement would join the if's suite."

	self assert: (self resultAt: 'no_continuation') asString
		equals: '((''after'', 1), (''after'', None))'.
%

category: 'Grail-Tests - Loops'
method: InlineSuiteContinuationTestCase
testAnInlineLoopSuiteCanBeFollowedByElse
	self assert: (self resultAt: 'for_else') asString equals: '[1, 2, ''done'']'.
	self assert: (self resultAt: 'while_else') asString equals: '[2, 1, ''done'']'.
%

category: 'Grail-Tests - Loops'
method: InlineSuiteContinuationTestCase
testAnInlineElseInsideALoopBody
	"``else: break'' nested in a while body -- the exact shape pydoc.locate()
	uses, and the one that surfaced this."

	self assert: (self resultAt: 'inline_break') asString equals: '(3, 0)'.
	self assert: (self resultAt: 'pydoc_locate_shape') asString equals: '(''b'', 2)'.
%

category: 'Grail-Tests - Already worked'
method: InlineSuiteContinuationTestCase
testTheShapesThatAlreadyWorkedStillDo
	"A BLOCK-bodied if with an inline else, and try/except with inline suites.
	These were the reason the gap was invisible: they are the same construct
	and they parsed."

	self assert: (self resultAt: 'block_if_inline_else') asString equals: '(1, 2)'.
	self assert: (self resultAt: 'try_except_inline') asString equals: '''caught'''.
%

set compile_env: 0
