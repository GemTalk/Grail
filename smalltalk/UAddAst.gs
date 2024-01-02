! ------------------- Remove existing behavior from UAddAst
expectvalue /Metaclass3
doit
UAddAst removeAllMethods.
UAddAst class removeAllMethods.
%
! ------------------- Class methods for UAddAst
! ------------------- Instance methods for UAddAst
set compile_env: 0
category: 'other'
method: UAddAst
printSmalltalkOn: aStream

	super printSmalltalkOn: aStream.
	aStream nextPutAll: ' __pos__'.
%
