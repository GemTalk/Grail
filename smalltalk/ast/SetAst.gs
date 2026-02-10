! ------------------- Remove existing behavior from SetAst
removeallmethods SetAst
removeallclassmethods SetAst
set compile_env: 0
! ------------------- Class methods for SetAst
! ------------------- Instance methods for SetAst
category: 'other'
method: SetAst
printSmalltalkOn: aStream

	aStream nextPutAll: '([:___s | '.
	elts do: [:each |
		aStream nextPutAll: '___s add: '.
		each printSmalltalkOn: aStream.
		aStream nextPutAll: '. '.
	].
	aStream nextPutAll: '___s] value: (set perform: #new env: 0))'.
%
