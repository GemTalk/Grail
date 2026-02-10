! ------------------- Remove existing behavior from PowAst
removeallmethods PowAst
removeallclassmethods PowAst
set compile_env: 0
! ------------------- Class methods for PowAst
! ------------------- Instance methods for PowAst
category: 'other'
method: PowAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __pow__: '.
%
