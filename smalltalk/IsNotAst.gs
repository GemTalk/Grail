! ------------------- Remove existing behavior from IsNotAst
expectvalue /Metaclass3
doit
IsNotAst removeAllMethods.
IsNotAst class removeAllMethods.
%
! ------------------- Class methods for IsNotAst
! ------------------- Instance methods for IsNotAst
set compile_env: 0
category: 'other'
method: IsNotAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' is_not: '.
%
