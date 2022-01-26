! ------------------- Remove existing behavior from NotAst
removeAllMethods NotAst
removeAllClassMethods NotAst
! ------------------- Class methods for NotAst
! ------------------- Instance methods for NotAst
set compile_env: 0
category: 'other'
method: NotAst
printSmalltalkOn: aStream

	super printSmalltalkOn: aStream.
	aStream nextPutAll: ' __not__'.
%
