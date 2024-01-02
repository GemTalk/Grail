! ------------------- Remove existing behavior from NotEqAst
expectvalue /Metaclass3
doit
NotEqAst removeAllMethods.
NotEqAst class removeAllMethods.
%
! ------------------- Class methods for NotEqAst
! ------------------- Instance methods for NotEqAst
set compile_env: 0
category: 'other'
method: NotEqAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __ne__: '.
%
