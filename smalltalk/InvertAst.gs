! ------------------- Remove existing behavior from InvertAst
removeAllMethods InvertAst
removeAllClassMethods InvertAst
! ------------------- Class methods for InvertAst
! ------------------- Instance methods for InvertAst
set compile_env: 0
category: 'other'
method: InvertAst
printSmalltalkOn: aStream

	super printSmalltalkOn: aStream.
	aStream nextPutAll: ' __invert__'.
%
