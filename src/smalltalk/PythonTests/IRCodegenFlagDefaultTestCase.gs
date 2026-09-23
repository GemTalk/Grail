! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for IRCodegenFlagDefaultTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'IRCodegenFlagDefaultTestCase'
  instVarNames: #( )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
IRCodegenFlagDefaultTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! IRCodegenFlagDefaultTestCase
!
! THE DEFAULT IS ON, AND THE VARIABLE DISABLES.
!
! GRAIL_IR_CODEGEN spent 130 cuts meaning "turn the IR path on".  It now means
! the opposite, and the two failure modes of getting that wrong are both quiet:
!
!   * a spelling of OFF that is not recognised leaves the IR path ON while the
!     caller believes it is measuring text -- and a two-arm comparison then
!     reports two arms that agree, which reads like a clean result rather than
!     a broken instrument;
!   * an EMPTY value (``GRAIL_IR_CODEGEN=$UNSET'') reading as OFF would take a
!     suite off the path it exists to gate, silently.
!
! So every spelling is pinned here rather than left to the reader of one
! boolean expression.  ___irCodegenFlagFor___: exists to make this testable
! without an SUnit case altering a running gem's environment.
! ===============================================================================

doit
IRCodegenFlagDefaultTestCase removeAllMethods.
IRCodegenFlagDefaultTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - the IR codegen flag'
method: IRCodegenFlagDefaultTestCase
testUnsetAndEmptyMeanOn
	"The flip itself.  Unset is the case every ordinary run takes."

	self assert: (importlib ___irCodegenFlagFor___: nil)
		description: 'an unset GRAIL_IR_CODEGEN did not mean ON'.
	self assert: (importlib ___irCodegenFlagFor___: '')
		description: 'an empty GRAIL_IR_CODEGEN did not mean ON'
%

category: 'Grail-Tests - the IR codegen flag'
method: IRCodegenFlagDefaultTestCase
testEveryOffSpellingMeansOff
	"Case included.  The list this replaced held ``false'' and ``FALSE'' but not
	``False'', so a reasonable spelling of OFF quietly meant ON."

	#('0' 'false' 'FALSE' 'False' 'no' 'NO' 'No' 'off' 'OFF' 'Off') do: [:each |
		self deny: (importlib ___irCodegenFlagFor___: each)
			description: 'GRAIL_IR_CODEGEN=' , each , ' did not disable the IR path']
%

category: 'Grail-Tests - the IR codegen flag'
method: IRCodegenFlagDefaultTestCase
testAnythingElseMeansOn
	"Including ``1'', so every script that set it before the flip still reads as
	the IR arm and needed no change."

	#('1' 'yes' 'true' 'on' 'ir' '2') do: [:each |
		self assert: (importlib ___irCodegenFlagFor___: each)
			description: 'GRAIL_IR_CODEGEN=' , each , ' did not mean ON']
%

category: 'Grail-Tests - the IR codegen flag'
method: IRCodegenFlagDefaultTestCase
testThisSessionIsOnTheIRPathUnlessTurnedOff
	"The default as this gem actually sees it -- the one thing the pure
	predicate above cannot say.

	Conditional on the environment rather than asserted outright, because a
	deliberate text-path run (GRAIL_IR_CODEGEN=0) is a legitimate way to run the
	suite and must not fail here.  On a kernel without builder support
	___irCodegenEnabled___ is false whatever the flag says, which is the
	platform gate doing its job."

	| raw |
	raw := System gemEnvironmentVariable: 'GRAIL_IR_CODEGEN'.
	(importlib ___irCodegenFlagFor___: raw) ifFalse: [
		^ self assert: importlib ___irCodegenEnabled___ not
			description: 'the flag asked for text and IR reported itself enabled'].
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	self assert: importlib ___irCodegenEnabled___
		description: 'IR is supported and not disabled, yet reports itself off'
%
