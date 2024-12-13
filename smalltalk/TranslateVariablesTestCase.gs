! ------------------- Remove existing behavior from TranslateVariablesTestCase
removeallmethods TranslateVariablesTestCase
removeallclassmethods TranslateVariablesTestCase
! ------------------- Class methods for TranslateVariablesTestCase
category: 'other'
classmethod: TranslateVariablesTestCase
filename

	^'Variables.py'
%
! ------------------- Instance methods for TranslateVariablesTestCase
category: 'other'
method: TranslateVariablesTestCase
testTranslateGlobalScope

	| stream |
	stream := PrettyWriteStream on: String new.
	module printSmalltalkOn: stream.
	stream contents evaluate.
%
