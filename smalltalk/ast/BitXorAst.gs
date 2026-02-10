! ------------------- Remove existing behavior from BitXorAst
removeallmethods BitXorAst
removeallclassmethods BitXorAst
set compile_env: 0
! ------------------- Class methods for BitXorAst
! ------------------- Instance methods for BitXorAst
category: 'other'
method: BitXorAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __xor__: '.
%
