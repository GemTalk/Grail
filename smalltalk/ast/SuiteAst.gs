! ------------------- Remove existing behavior from SuiteAst
removeallmethods SuiteAst
removeallclassmethods SuiteAst
set compile_env: 0
! ------------------- Class methods for SuiteAst
! ------------------- Instance methods for SuiteAst
category: 'other'
method: SuiteAst
body

	^body
%
category: 'other'
method: SuiteAst
printSmalltalkOn: aStream

	body do: [:stmt |
		stmt printSmalltalkOn: aStream.
		aStream lf.
	].
%
category: 'other'
method: SuiteAst
size


	^body size
%
