! ------------------- Remove existing behavior from USubAst
removeAllMethods USubAst
removeAllClassMethods USubAst
! ------------------- Class methods for USubAst
! ------------------- Instance methods for USubAst
set compile_env: 0
category: 'other'
method: USubAst
printSmalltalkOn: aStream

	super printSmalltalkOn: aStream.
	aStream nextPutAll: ' __neg__'.
%
