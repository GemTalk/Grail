! ------------------- Remove existing behavior from PyBreak
expectvalue /Metaclass3       
doit
PyBreak removeAllMethods.
PyBreak class removeAllMethods.
%
! ------------------- Class methods for PyBreak
! ------------------- Instance methods for PyBreak
set compile_env: 0
category: 'other'
method: PyBreak
evaluate
	BreakNotification signal.
%
category: 'other'
method: PyBreak
initialize

self readPositionOnly
%
