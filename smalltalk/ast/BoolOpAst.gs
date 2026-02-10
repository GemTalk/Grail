! ------------------- Remove existing behavior from BoolOpAst
removeallmethods BoolOpAst
removeallclassmethods BoolOpAst
set compile_env: 0
! ------------------- Class methods for BoolOpAst
category: 'other'
classmethod: BoolOpAst
isAbstract

	^self == BoolOpAst
%
! ------------------- Instance methods for BoolOpAst
