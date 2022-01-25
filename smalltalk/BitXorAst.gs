! ------------------- Remove existing behavior from BitXorAst
removeAllMethods BitXorAst
removeAllClassMethods BitXorAst
! ------------------- Class methods for BitXorAst
! ------------------- Instance methods for BitXorAst
set compile_env: 0
category: 'other'
method: BitXorAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __xor__: '.
%
