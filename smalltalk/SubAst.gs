! ------------------- Remove existing behavior from SubAst
removeAllMethods SubAst
removeAllClassMethods SubAst
! ------------------- Class methods for SubAst
! ------------------- Instance methods for SubAst
set compile_env: 0
category: 'other'
method: SubAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __sub__: '.
%
