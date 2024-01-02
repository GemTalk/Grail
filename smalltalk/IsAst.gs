! ------------------- Remove existing behavior from IsAst
expectvalue /Metaclass3
doit
IsAst removeAllMethods.
IsAst class removeAllMethods.
%
! ------------------- Class methods for IsAst
! ------------------- Instance methods for IsAst
set compile_env: 0
category: 'other'
method: IsAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' is_: '.
%
