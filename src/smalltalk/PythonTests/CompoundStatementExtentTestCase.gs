! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'CompoundStatementExtentTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
CompoundStatementExtentTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! CompoundStatementExtentTestCase - where a BLOCK-BEARING statement's span ends.
!
! Issue #825: a compound statement's extent ran past its own body, through the
! blank lines after it, and one character into whatever came next.  The end came
! from the block's closing DEDENT, and a DEDENT is emitted with the tokenizer
! already standing on the first character of the NEXT statement.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
CompoundStatementExtentTestCase removeAllMethods.
CompoundStatementExtentTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-helpers'
method: CompoundStatementExtentTestCase
topLevelStatementsOf: aString
	"The module body's statements, as an Array."

	^(PythonParser parse: aString) body body
%

category: 'Grail-helpers'
method: CompoundStatementExtentTestCase
segmentOf: aNode in: aString
	"The source aNode's extent actually covers -- CPython's
	``ast.get_source_segment''.  endPosition is the 1-based index of the span's
	LAST CHARACTER, so the slice is inclusive at both ends.

	Asserting on TEXT rather than on numbers is deliberate: the reported symptom
	was a span whose numbers looked plausible (endLine 5 of a 12-line module)
	and whose text was visibly wrong -- it ended on the ``d'' of the following
	``def''."

	| last |
	aNode beginPosition isNil ifTrue: [^ nil].
	aNode endPosition isNil ifTrue: [^ nil].
	last := aNode endPosition min: aString size.
	^ aString copyFrom: aNode beginPosition to: last
%

category: 'Grail-tests - extents'
method: CompoundStatementExtentTestCase
testDefEndsAtItsLastStatement
	"The case as reported (#825).  Two blank lines separate the defs, and the
	first def's span used to run through both of them and take the ``d'' of the
	second def with it -- 31 characters where the def is 27."

	| src stmts |
	src := 'def answer():
    return 42


def other():
    return 43
'.
	stmts := self topLevelStatementsOf: src.
	self assert: (self segmentOf: (stmts at: 1) in: src)
		equals: 'def answer():
    return 42'.
	self assert: (stmts at: 1) beginLine equals: 1.
	self assert: (stmts at: 1) endLine equals: 2.
	self assert: (stmts at: 1) endPosition equals: 27.
%

category: 'Grail-tests - extents'
method: CompoundStatementExtentTestCase
testSeveralSuitesClosingAtOnce
	"Closing more than one suite emits more than one DEDENT, and only the
	INNERMOST block consumed one of them.  So skipping a single DEDENT -- the
	obvious reading of the bug -- still leaves the outer def ending on a DEDENT,
	and its span still reaches the next statement.

	This is the case that makes the loop in ``lastSpanToken'' load-bearing
	rather than defensive: here the dedent from column 8 to column 0 is one
	tokenizer step that emits TWO tokens."

	| src stmts |
	src := 'def outer():
    if c:
        return 1

x = 5
'.
	stmts := self topLevelStatementsOf: src.
	self assert: (self segmentOf: (stmts at: 1) in: src)
		equals: 'def outer():
    if c:
        return 1'.
	self assert: (stmts at: 1) endLine equals: 3.
	self assert: (self segmentOf: (stmts at: 2) in: src) equals: 'x = 5'.
%

category: 'Grail-tests - extents'
method: CompoundStatementExtentTestCase
testEveryBlockBearingStatementStaysInsideItself
	"Not a ``def'' bug.  Every statement that ends with a block ends on that
	block's DEDENT, so class / if / while / for / with / try / match were all
	over-extended the same way.  The invariant asserted here is the one the
	defect broke, stated once for the whole family: a statement's span must not
	reach the statement AFTER it."

	| src stmts prev |
	src := 'class Holder:
    def get(self):
        return 1


if c:
    a()
elif d:
    b()
else:
    e()


while flag:
    step()


for i in items:
    use(i)


with ctx() as h:
    use(h)


try:
    risky()
except ValueError:
    handle()
else:
    fine()
finally:
    done()


match v:
    case 1:
        one()
    case _:
        other()


x = 5
'.
	stmts := self topLevelStatementsOf: src.
	self assert: stmts size equals: 8.
	prev := nil.
	stmts do: [:each |
		self deny: each endPosition isNil.
		self deny: each endLine isNil.
		"Never ends on whitespace: the DEDENT sat on the next statement's first
		character, so the character BEFORE the reported end was a newline."
		self deny: (src at: each endPosition) isSeparator.
		self assert: each endPosition >= each beginPosition.
		prev ifNotNil: [
			self assert: prev endPosition < each beginPosition].
		prev := each].
	"And the last one is the simple statement, unaffected either way -- the
	control that shows the walk above is not vacuously true of anything."
	self assert: (self segmentOf: (stmts at: 8) in: src) equals: 'x = 5'.
%

category: 'Grail-tests - extents'
method: CompoundStatementExtentTestCase
testNestedBlocksAreContainedInTheirParents
	"A nested def's span has to end before its enclosing def's does.  While the
	end came from the DEDENT both ended in the same place -- on the first
	character after the OUTERMOST block -- so containment held only by accident
	and equality, and a tool walking the tree could not tell the two apart."

	| src outer inner outerBody |
	src := 'def outer():
    def inner():
        return 1
    return inner


y = 2
'.
	outer := (self topLevelStatementsOf: src) at: 1.
	outerBody := outer body body.
	inner := outerBody at: 1.
	self assert: (self segmentOf: inner in: src)
		equals: 'def inner():
        return 1'.
	self assert: inner endLine equals: 3.
	self assert: inner endPosition < outer endPosition.
	self assert: (self segmentOf: outer in: src)
		equals: 'def outer():
    def inner():
        return 1
    return inner'.
	self assert: outer endLine equals: 4.
%

category: 'Grail-tests - extents'
method: CompoundStatementExtentTestCase
testTrailingBlankLinesAreNotPartOfTheSpan
	"Blank lines after a block belong to nobody.  The tokenizer skips them
	before deciding the indentation changed, so the DEDENT carried a position
	past all of them however many there were -- the span grew with the number of
	blank lines, which is why the reported endLine (5) was nowhere near the
	def (2)."

	| oneLine manyLines |
	oneLine := 'def f():
    return 1

z = 0
'.
	manyLines := 'def f():
    return 1




z = 0
'.
	self assert: ((self topLevelStatementsOf: oneLine) at: 1) endPosition
		equals: ((self topLevelStatementsOf: manyLines) at: 1) endPosition.
	self assert: ((self topLevelStatementsOf: manyLines) at: 1) endLine equals: 2.
%

category: 'Grail-tests - extents'
method: CompoundStatementExtentTestCase
testBlockAtEndOfSourceStillEnds
	"The other edge: no next statement at all, so the block is closed by the
	DEDENTs the tokenizer emits at end of input, followed by ENDMARKER.  Those
	are skipped for the same reason, and the walk must not run off the front of
	the token stream while doing it."

	| src stmt |
	src := 'def f():
    return 1'.
	stmt := (self topLevelStatementsOf: src) at: 1.
	self assert: (self segmentOf: stmt in: src) equals: src.
	self assert: stmt endLine equals: 2.
%

category: 'Grail-tests - extents'
method: CompoundStatementExtentTestCase
testSimpleStatementSpansAreUnchanged
	"The control for the skipping itself.  A simple statement's node is built
	BEFORE its terminating NEWLINE is consumed, so its span never included one
	-- and skipping NEWLINE in ``lastSpanToken'' is what keeps a compound
	statement from ending one character later than the simple statement nested
	inside it.  If the skip list were wrong in the other direction (skipping a
	real token) these would move."

	| src stmts |
	src := 'x = 5
y = x + 1
del y
'.
	stmts := self topLevelStatementsOf: src.
	self assert: (self segmentOf: (stmts at: 1) in: src) equals: 'x = 5'.
	self assert: (self segmentOf: (stmts at: 2) in: src) equals: 'y = x + 1'.
	self assert: (self segmentOf: (stmts at: 3) in: src) equals: 'del y'.
%
