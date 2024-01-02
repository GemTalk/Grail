! ------------------- Remove existing behavior from TranslateVariablesTestCase
expectvalue /Metaclass3
doit
TranslateVariablesTestCase removeAllMethods.
TranslateVariablesTestCase class removeAllMethods.
%
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
	stream contents evaluate.
%
