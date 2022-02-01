! ------------------- Remove existing behavior from NotInAst
removeAllMethods NotInAst
removeAllClassMethods NotInAst
! ------------------- Class methods for NotInAst
! ------------------- Instance methods for NotInAst
set compile_env: 0
category: 'other'
method: NotInAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' ___contains_not: '.
%
