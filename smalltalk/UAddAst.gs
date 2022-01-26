! ------------------- Remove existing behavior from UAddAst
removeAllMethods UAddAst
removeAllClassMethods UAddAst
! ------------------- Class methods for UAddAst
! ------------------- Instance methods for UAddAst
set compile_env: 0
category: 'other'
method: UAddAst
printSmalltalkOn: aStream

	super printSmalltalkOn: aStream.
	aStream nextPutAll: ' __pos__'.
%
