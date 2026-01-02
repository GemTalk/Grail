! ------------------- Remove existing behavior from LoadAst
removeallmethods LoadAst
removeallclassmethods LoadAst
set compile_env: 0
! ------------------- Class methods for LoadAst
! ------------------- Instance methods for LoadAst
category: 'other'
method: LoadAst
assertIsLoad
	"Override to avoid inherited error"
%
