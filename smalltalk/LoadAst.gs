! ------------------- Remove existing behavior from LoadAst
removeAllMethods LoadAst
removeAllClassMethods LoadAst
! ------------------- Class methods for LoadAst
! ------------------- Instance methods for LoadAst
set compile_env: 0
category: 'other'
method: LoadAst
assertIsLoad
	"Override to avoid inherited error"
%
