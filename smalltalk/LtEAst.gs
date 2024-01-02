! ------------------- Remove existing behavior from LtEAst
expectvalue /Metaclass3
doit
LtEAst removeAllMethods.
LtEAst class removeAllMethods.
%
! ------------------- Class methods for LtEAst
! ------------------- Instance methods for LtEAst
set compile_env: 0
category: 'other'
method: LtEAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __le__: '.
%
