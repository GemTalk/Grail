! ------------------- Remove existing behavior from AddAst
removeallmethods AddAst
removeallclassmethods AddAst
set compile_env: 0
! ------------------- Class methods for AddAst
! ------------------- Instance methods for AddAst
category: 'other'
method: AddAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __add__: '.
%
