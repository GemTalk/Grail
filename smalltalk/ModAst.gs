! ------------------- Remove existing behavior from ModAst
removeAllMethods ModAst
removeAllClassMethods ModAst
! ------------------- Class methods for ModAst
! ------------------- Instance methods for ModAst
set compile_env: 0
category: 'other'
method: ModAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __mod__: '.
%
