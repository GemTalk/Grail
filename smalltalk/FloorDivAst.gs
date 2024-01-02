! ------------------- Remove existing behavior from FloorDivAst
expectvalue /Metaclass3
doit
FloorDivAst removeAllMethods.
FloorDivAst class removeAllMethods.
%
! ------------------- Class methods for FloorDivAst
! ------------------- Instance methods for FloorDivAst
set compile_env: 0
category: 'other'
method: FloorDivAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __floordiv__: '.
%
