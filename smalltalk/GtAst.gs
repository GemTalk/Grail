! ------------------- Remove existing behavior from GtAst
removeAllMethods GtAst
removeAllClassMethods GtAst
! ------------------- Class methods for GtAst
! ------------------- Instance methods for GtAst
set compile_env: 0
category: 'other'
method: GtAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __gt__: '.
%
