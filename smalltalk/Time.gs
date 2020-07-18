! ------------------- Remove existing behavior from Time
expectvalue /Metaclass3       
doit
Time removeAllMethods.
Time class removeAllMethods.
%
! ------------------- Class methods for Time
! ------------------- Instance methods for Time
set compile_env: 0
category: 'other'
method: Time
initialize
"
	SessionTemps current removeKey: #'Python_Time' ifAbsent: [].
"
	super initialize.
	dictionary 
		at: #'sleep'		put: [:arguments :keywords | self sleep: arguments first];
		at: #'time'		put: [:arguments :keywords | self time];
		yourself.
%
category: 'other'
method: Time
sleep: seconds

	(Delay forMilliseconds: (seconds * 1000) ceiling) wait.
%
category: 'other'
method: Time
time

	^System _timeGmtFloat
%
