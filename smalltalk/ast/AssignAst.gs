! ------------------- Remove existing behavior from AssignAst
removeallmethods AssignAst
removeallclassmethods AssignAst
set compile_env: 0
! ------------------- Class methods for AssignAst
! ------------------- Instance methods for AssignAst
category: 'other'
method: AssignAst
addVariableNamesTo: aStream

	targets do: [:each | 
		each addVariableNamesTo: aStream.
	].
%
category: 'other'
method: AssignAst
printSmalltalkOn: aStream

	targets first printSmalltalkOn: aStream.
	aStream nextPutAll: ' := '.
	value printSmalltalkOn: aStream.
	aStream nextPut: $..
%
category: 'other'
method: AssignAst
target

	^targets at: 1
%
