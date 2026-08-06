! ------------------- Superclass check
run
TestResult ifNil: [self error: 'TestResult is not defined. Check file ordering.'].
%

! ------------------- Class definition for GrailTestResult
expectvalue /Class
doit
TestResult subclass: 'GrailTestResult'
  instVarNames: #('details')
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
GrailTestResult category: 'Grail-SUnit'
%

! ===============================================================================
! GrailTestResult -- a TestResult that remembers WHY each test failed.
!
! Stock SUnit throws the diagnosis away.  TestResult>>runCase: is
!
!     [aTestCase runCase. self addPass: aTestCase]
!         on: self class failure , self class error
!         do: [:ex | ex sunitAnnounce: aTestCase toResult: self]
!
! and sunitAnnounce:toResult: only ever does ``aTestResult addFailure: aTestCase''
! -- the exception, its messageText and its stack are dropped on the floor.  So
! the failures/errors collections hold bare TestCase instances, a CI log can say
! no more than ``FooTestCase debug: #testBar'', and finding out what actually
! went wrong means reproducing the run by hand.  That cost a full 3.7.5 install
! to read a single one-line error.
!
! This subclass captures the text (and, for errors, a stack) in the handler and
! keeps it alongside the test.  Two constraints shape how:
!
!   * the handler has to EXIT the protected block itself.  Stock SUnit leaves
!     that to sunitAnnounce:toResult:, whose ``self sunitExitWith: false'' is
!     ``self return: false'' for a plain TestFailure -- but ``self resume:
!     false'' for the ResumableTestFailure that GsTestCase>>assert: signals,
!     which would carry the failed test on past its failing assertion and then
!     record it as a pass as well.  runCase: below records and returns
!     explicitly instead.
!   * the stack is only live while the handler is on it, so stackReportToLevel:
!     must be sent from inside the handler, not from a later report pass.
!
! TestSuite>>run hardcodes ``TestResult new'', so callers cannot get this class
! by asking the suite; use GrailTestResult class>>run: instead, which mirrors
! TestSuite>>run including its TestResource reset.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
GrailTestResult removeAllMethods.
GrailTestResult class removeAllMethods.
%

set compile_env: 0

category: 'Grail-SUnit-Running'
classmethod: GrailTestResult
run: aTestSuite
	"Run aTestSuite into one of these instead of a stock TestResult.  Mirrors
	TestSuite>>run, which cannot be reused because it hardcodes TestResult new;
	the TestResource reset is part of that contract, not an optional extra."

	| result |
	result := self new.
	[aTestSuite run: result]
		ensure: [TestResource resetResources: aTestSuite resources].
	^ result
%

category: 'Grail-SUnit-Running'
classmethod: GrailTestResult
defaultStackFrames
	"How many stack frames to report per ERROR.  GRAIL_TEST_STACK_FRAMES tunes
	it; 0 suppresses stacks entirely.  Failures never get one -- an assertion
	message says everything, and the frames are all SUnit plumbing."

	| raw n |
	raw := System gemEnvironmentVariable: 'GRAIL_TEST_STACK_FRAMES'.
	raw isNil ifTrue: [^ 20].
	raw := raw asString.
	raw isEmpty ifTrue: [^ 20].
	n := raw asNumber.
	n isNil ifTrue: [^ 20].
	n < 0 ifTrue: [^ 0].
	^ n truncated
%

category: 'Grail-SUnit-Reporting'
method: GrailTestResult
details
	"Array of 4-element Arrays { kindString. testCase. messageString. stackStringOrNil },
	in the order the defects were encountered."

	details isNil ifTrue: [details := OrderedCollection new].
	^ details
%

category: 'Grail-SUnit-Reporting'
method: GrailTestResult
runCase: aTestCase
	"As TestResult>>runCase:, except the exception is examined before it is
	recorded -- capture has to come first, because the handler exits.

	The exit is done HERE, with an explicit ``ex return:'', rather than by
	sunitAnnounce:toResult:.  PythonTestCase is a GsTestCase, and
	GsTestCase>>assert:description: signals a RESUMABLE failure
	(ResumableTestFailure), whose sunitExitWith: is ``self resume:'', not
	``self return:''.  Announcing through it therefore RESUMED the failed
	assertion: the test body ran on past it, aTestCase runCase returned
	normally, and the protected block went on to addPass: -- so every failing
	test was counted BOTH as a failure and as a pass (runCount inflated,
	SetUpBridgeTestCase>>testAssertionFailureIsStillAFailure red) and every
	assertion after the first failure still ran.  Grail's tests are written
	for stock SUnit semantics, where the first failed assert ends the test."

	[aTestCase runCase.
	 self addPass: aTestCase]
		on: self class failure , self class error
		do: [:ex |
			self record: ex for: aTestCase.
			(ex isKindOf: self class failure)
				ifTrue: [self addFailure: aTestCase]
				ifFalse: [self addError: aTestCase].
			ex return: nil]
%

category: 'Grail-SUnit-Reporting'
method: GrailTestResult
record: ex for: aTestCase
	"Capture what stock SUnit discards.  Every step is guarded: a test that
	fails by way of a half-built exception (messageText itself raising) must
	still be RECORDED as a defect rather than taking down the whole shard."

	| isFailure kind text stack |
	isFailure := [ex isKindOf: self class failure]
		on: Error do: [:inner | inner return: false].
	kind := isFailure ifTrue: ['FAIL'] ifFalse: ['ERROR'].
	text := self safeTextOf: ex.
	stack := nil.
	isFailure ifFalse: [stack := self safeStack].
	self details add: (Array
		with: kind
		with: aTestCase
		with: text
		with: stack)
%

category: 'Grail-SUnit-Reporting'
method: GrailTestResult
safeTextOf: ex
	"messageText, but never raising and never nil."

	^ [ | t |
	   t := ex messageText.
	   t isNil ifTrue: [ex class name asString] ifFalse: [t asString]]
		on: Error
		do: [:inner |
			inner return: '<messageText raised ' , inner class name asString , '>']
%

category: 'Grail-SUnit-Reporting'
method: GrailTestResult
safeStack
	"The live stack, read from inside the handler -- the only place it exists.
	Ask for more frames than we report, because the innermost ones describe the
	CAPTURE, not the failure, and get trimmed away."

	| n |
	n := self class defaultStackFrames.
	n = 0 ifTrue: [^ nil].
	^ [self trimStack: (GsProcess stackReportToLevel: n + 10) asString limit: n]
		on: Error
		do: [:inner | inner return: nil]
%

category: 'Grail-SUnit-Reporting'
classmethod: GrailTestResult
captureFramePatterns
	"Frames that exist only because we are capturing the stack from inside an
	exception handler.  Untrimmed they occupy the first five or six lines --
	exactly where a reader looks first -- and with a small frame budget they can
	be the ENTIRE report.

	Matched only against LEADING frames, and scanning stops at the first frame
	that matches nothing, so a pattern going stale costs a little noise and can
	never swallow a real frame.  (The one case it would mislead is a test of
	GrailTestResult itself, whose genuine frames name the class.)"

	^ #( 'GrailTestResult'
		'(AbstractException) >>'
		'(ExecBlock) >> on:do:'
		') >> doesNotUnderstand:'
		') >> _doesNotUnderstand:' )
%

category: 'Grail-SUnit-Reporting'
classmethod: GrailTestResult
sunitBoundaryFrame
	"Below this frame the stack is all SUnit and topaz -- identical for every
	defect, so it carries no information about this one."

	^ '(TestCase) >> performTest'
%

category: 'Grail-SUnit-Reporting'
method: GrailTestResult
trimStack: aReport limit: n
	"Keep the frames BETWEEN the capture machinery and the SUnit boundary."

	| keep atTop |
	keep := OrderedCollection new.
	atTop := true.
	(self linesOf: aReport) do: [:each |
		(atTop and: [self isCaptureFrame: each])
			ifFalse: [
				atTop := false.
				(self matches: self class sunitBoundaryFrame in: each)
					ifTrue: [^ self joinLines: keep].
				keep size < n ifTrue: [keep add: each]]].
	^ self joinLines: keep
%

category: 'Grail-SUnit-Reporting'
method: GrailTestResult
isCaptureFrame: aLine
	^ (self class captureFramePatterns
		detect: [:pat | self matches: pat in: aLine]
		ifNone: [nil]) notNil
%

category: 'Grail-SUnit-Reporting'
method: GrailTestResult
matches: aPattern in: aLine
	"Substring test spelled with indexOfSubCollection: -- present on both 3.7.x
	and 4.0."

	^ (aLine indexOfSubCollection: aPattern) > 0
%

category: 'Grail-SUnit-Reporting'
method: GrailTestResult
joinLines: aCollection
	"nil rather than an empty string, so a caller can tell ``no stack'' from
	``a stack of nothing'' and skip the heading."

	| ws first |
	aCollection isEmpty ifTrue: [^ nil].
	ws := WriteStream on: String new.
	first := true.
	aCollection do: [:each |
		first ifFalse: [ws nextPut: (String with: Character lf) first].
		first := false.
		ws nextPutAll: each].
	^ ws contents
%

category: 'Grail-SUnit-Reporting'
method: GrailTestResult
reportOn: aStream prefix: aPrefix
	"Write every defect as a block of aPrefix-tagged lines, so a caller can
	recover the whole report with a single line-oriented grep even though
	messages and stacks are multi-line.  Each block ends with a ready-to-paste
	``FooTestCase debug: #testBar''."

	self details do: [:each |
		self reportOne: each on: aStream prefix: aPrefix]
%

category: 'Grail-SUnit-Reporting'
method: GrailTestResult
reportOne: aDetail on: aStream prefix: aPrefix
	"One defect: header, message body, stack, repro line."

	| kind testCase |
	kind := aDetail at: 1.
	testCase := aDetail at: 2.
	aStream nextPutAll: aPrefix; nextPutAll: '['; nextPutAll: kind;
		nextPutAll: '] '; nextPutAll: (self nameOf: testCase); cr.
	self lines: (aDetail at: 3) on: aStream prefix: aPrefix indent: '    '.
	(aDetail at: 4) ifNotNil: [:stack |
		aStream nextPutAll: aPrefix; nextPutAll: '    stack:'; cr.
		self lines: stack on: aStream prefix: aPrefix indent: '      '].
	aStream nextPutAll: aPrefix; nextPutAll: '    repro: ';
		nextPutAll: (self reproOf: testCase); cr
%

category: 'Grail-SUnit-Reporting'
method: GrailTestResult
lines: aString on: aStream prefix: aPrefix indent: anIndent
	"Emit aString with EVERY line carrying aPrefix.  Python tracebacks and
	stack reports are multi-line, and a report that only tags its first line
	is one a log filter silently truncates."

	(self linesOf: aString) do: [:each |
		aStream nextPutAll: aPrefix; nextPutAll: anIndent;
			nextPutAll: each; cr]
%

category: 'Grail-SUnit-Reporting'
method: GrailTestResult
linesOf: aString
	"Split on linefeeds.  A trailing linefeed yields no final empty line."

	| lf out size start |
	out := OrderedCollection new.
	aString isNil ifTrue: [^ out].
	size := aString size.
	size = 0 ifTrue: [^ out].
	lf := (String with: Character lf) at: 1.
	start := 1.
	[start <= size] whileTrue: [
		| stop |
		stop := aString indexOf: lf startingAt: start.
		stop = 0 ifTrue: [stop := size + 1].
		out add: (aString copyFrom: start to: stop - 1).
		start := stop + 1].
	^ out
%

category: 'Grail-SUnit-Reporting'
method: GrailTestResult
nameOf: aTestCase
	"ClassName>>selector, guarded -- printOn: is user code in a subclass."

	^ [aTestCase class name asString , '>>' , aTestCase selector asString]
		on: Error
		do: [:inner | inner return: '<unprintable test case>']
%

category: 'Grail-SUnit-Reporting'
method: GrailTestResult
reproOf: aTestCase
	"The copy-pasteable one-liner that re-runs just this test."

	^ [aTestCase class name asString , ' debug: #' , aTestCase selector asString]
		on: Error
		do: [:inner | inner return: '<unknown>']
%
