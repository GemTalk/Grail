! ------------------- Remove existing behavior from DivAst
removeAllMethods DivAst
removeAllClassMethods DivAst
! ------------------- Class methods for DivAst
! ------------------- Instance methods for DivAst
set compile_env: 0
category: 'other'
method: DivAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __truediv__: '.
%
