! ------------------- Remove existing behavior from EqAst
expectvalue /Metaclass3
doit
EqAst removeAllMethods.
EqAst class removeAllMethods.
%
! ------------------- Class methods for EqAst
! ------------------- Instance methods for EqAst
set compile_env: 0
category: 'other'
method: EqAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __eq__: '.
%
