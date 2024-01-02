! ------------------- Remove existing behavior from PowAst
expectvalue /Metaclass3
doit
PowAst removeAllMethods.
PowAst class removeAllMethods.
%
! ------------------- Class methods for PowAst
! ------------------- Instance methods for PowAst
set compile_env: 0
category: 'other'
method: PowAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __pow__: '.
%
