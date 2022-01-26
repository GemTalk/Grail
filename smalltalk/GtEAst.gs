! ------------------- Remove existing behavior from GtEAst
removeAllMethods GtEAst
removeAllClassMethods GtEAst
! ------------------- Class methods for GtEAst
! ------------------- Instance methods for GtEAst
set compile_env: 0
category: 'other'
method: GtEAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __ge__: '.
%
