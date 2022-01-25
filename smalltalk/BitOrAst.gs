! ------------------- Remove existing behavior from BitOrAst
removeAllMethods BitOrAst
removeAllClassMethods BitOrAst
! ------------------- Class methods for BitOrAst
! ------------------- Instance methods for BitOrAst
set compile_env: 0
category: 'other'
method: BitOrAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __or__: '.
%
