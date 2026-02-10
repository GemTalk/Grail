! ------------------- Remove existing behavior from DivAst
removeallmethods DivAst
removeallclassmethods DivAst
set compile_env: 0
! ------------------- Class methods for DivAst
! ------------------- Instance methods for DivAst
category: 'other'
method: DivAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __truediv__: '.
%
