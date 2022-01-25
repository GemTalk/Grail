! ------------------- Remove existing behavior from MultAst
removeAllMethods MultAst
removeAllClassMethods MultAst
! ------------------- Class methods for MultAst
! ------------------- Instance methods for MultAst
set compile_env: 0
category: 'other'
method: MultAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __mul__: '.
%
