! ------------------- Remove existing behavior from PyTime
expectvalue /Metaclass3       
doit
PyTime removeAllMethods.
PyTime class removeAllMethods.
%
! ------------------- Class methods for PyTime
set compile_env: 0
category: 'other'
classmethod: PyTime
moduleName

	^#'time'
%
! ------------------- Instance methods for PyTime
set compile_env: 0
category: 'other'
method: PyTime
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
method: PyTime
sleep: seconds

	(Delay forMilliseconds: (seconds * 1000) ceiling) wait.
%
category: 'other'
method: PyTime
time

	^System _timeGmtFloat
%
