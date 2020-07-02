! ------------------- Remove existing behavior from PyContinue
expectvalue /Metaclass3       
doit
PyContinue removeAllMethods.
PyContinue class removeAllMethods.
%
! ------------------- Class methods for PyContinue
! ------------------- Instance methods for PyContinue
set compile_env: 0
category: 'other'
method: PyContinue
addMissingPositions
%
category: 'other'
method: PyContinue
evaluate
	ContinueNotification signal
%
category: 'other'
method: PyContinue
initialize
"continue"
%
