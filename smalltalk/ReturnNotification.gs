! ------------------- Remove existing behavior from ReturnNotification
expectvalue /Metaclass3       
doit
ReturnNotification removeAllMethods.
ReturnNotification class removeAllMethods.
%
! ------------------- Class methods for ReturnNotification
! ------------------- Instance methods for ReturnNotification
set compile_env: 0
category: 'other'
method: ReturnNotification
signal: anObject

	value := anObject.
	self signal.
%
category: 'other'
method: ReturnNotification
value

	^value
%
