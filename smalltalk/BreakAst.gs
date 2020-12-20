! ------------------- Remove existing behavior from BreakAst
removeAllMethods BreakAst
removeAllClassMethods BreakAst
! ------------------- Class methods for BreakAst
! ------------------- Instance methods for BreakAst
set compile_env: 0
category: 'other'
method: BreakAst
evaluate: aScope

	BreakNotification signal.
%
category: 'other'
method: BreakAst
initialize

self readPositionOnly
%
