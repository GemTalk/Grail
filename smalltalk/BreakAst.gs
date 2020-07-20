! ------------------- Remove existing behavior from BreakAst
expectvalue /Metaclass3       
doit
BreakAst removeAllMethods.
BreakAst class removeAllMethods.
%
! ------------------- Class methods for BreakAst
! ------------------- Instance methods for BreakAst
set compile_env: 0
category: 'other'
method: BreakAst
evaluate
	BreakNotification signal.
%
category: 'other'
method: BreakAst
initialize

self readPositionOnly
%
