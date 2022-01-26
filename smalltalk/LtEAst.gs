! ------------------- Remove existing behavior from LtEAst
removeAllMethods LtEAst
removeAllClassMethods LtEAst
! ------------------- Class methods for LtEAst
! ------------------- Instance methods for LtEAst
set compile_env: 0
category: 'other'
method: LtEAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __le__: '.
%
