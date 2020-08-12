! ------------------- Remove existing behavior from time
expectvalue /Metaclass3       
doit
time removeAllMethods.
time class removeAllMethods.
%
! ------------------- Class methods for time
set compile_env: 0
category: 'other'
classmethod: time
moduleName

	^#'time'
%
! ------------------- Instance methods for time
set compile_env: 0
category: 'other'
method: time
initialize
"
	SessionTemps current removeKey: #'Python_Time' ifAbsent: [].
"
	super initialize.
	globals 
		at: #'__class__'	put: module;
		at: #'sleep'			put: [:arguments :keywords :scope | self sleep: arguments first];
		at: #'time'			put: [:arguments :keywords :scope | self time];
		yourself.
%
category: 'other'
method: time
sleep: seconds

	(Delay forMilliseconds: (seconds * 1000) ceiling) wait.
%
category: 'other'
method: time
time

	^System _timeGmtFloat
%
