! ------------------- Remove existing behavior from TranslateVariablesTestCase
removeAllMethods TranslateVariablesTestCase
removeAllClassMethods TranslateVariablesTestCase
! ------------------- Class methods for TranslateVariablesTestCase
set compile_env: 0
category: 'other'
classmethod: TranslateVariablesTestCase
filename

	^'Variables.py'
%
! ------------------- Instance methods for TranslateVariablesTestCase
set compile_env: 0
category: 'other'
method: TranslateVariablesTestCase
testTranslateGlobalScope

	| stream |
	
	stream := PrettyWriteStream on: String new.

	module printSmalltalkOn: stream.

	self halt.
%
