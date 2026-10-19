Class {
	#name : 'IRCodegenFlagDefaultTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - the IR codegen flag' }
IRCodegenFlagDefaultTestCase >> testAnythingElseMeansOn [
	"Including ``1'', so every script that set it before the flip still reads as
	the IR arm and needed no change."

	#('1' 'yes' 'true' 'on' 'ir' '2') do: [:each |
		self assert: (importlib ___irCodegenFlagFor___: each)
			description: 'GRAIL_IR_CODEGEN=' , each , ' did not mean ON']

]

{ #category : 'Grail-Tests - the IR codegen flag' }
IRCodegenFlagDefaultTestCase >> testEveryOffSpellingMeansOff [
	"Case included.  The list this replaced held ``false'' and ``FALSE'' but not
	``False'', so a reasonable spelling of OFF quietly meant ON."

	#('0' 'false' 'FALSE' 'False' 'no' 'NO' 'No' 'off' 'OFF' 'Off') do: [:each |
		self deny: (importlib ___irCodegenFlagFor___: each)
			description: 'GRAIL_IR_CODEGEN=' , each , ' did not disable the IR path']

]

{ #category : 'Grail-Tests - the IR codegen flag' }
IRCodegenFlagDefaultTestCase >> testThisSessionIsOnTheIRPathUnlessTurnedOff [
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

]

{ #category : 'Grail-Tests - the IR codegen flag' }
IRCodegenFlagDefaultTestCase >> testUnsetAndEmptyMeanOn [
	"The flip itself.  Unset is the case every ordinary run takes."

	self assert: (importlib ___irCodegenFlagFor___: nil)
		description: 'an unset GRAIL_IR_CODEGEN did not mean ON'.
	self assert: (importlib ___irCodegenFlagFor___: '')
		description: 'an empty GRAIL_IR_CODEGEN did not mean ON'

]
