! ------------------- Remove existing behavior from RShiftAst
removeallmethods RShiftAst
removeallclassmethods RShiftAst
set compile_env: 0
! ------------------- Class methods for RShiftAst
! ------------------- Instance methods for RShiftAst
category: 'other'
method: RShiftAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __rshift__: '.
%
