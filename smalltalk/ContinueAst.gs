! ------------------- Remove existing behavior from ContinueAst
expectvalue /Metaclass3       
doit
ContinueAst removeAllMethods.
ContinueAst class removeAllMethods.
%
! ------------------- Class methods for ContinueAst
! ------------------- Instance methods for ContinueAst
set compile_env: 0
category: 'other'
method: ContinueAst
evaluate
	ContinueNotification signal
%
category: 'other'
method: ContinueAst
initialize
"continue"

	self readPositionOnly
%
