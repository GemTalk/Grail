! ------------------- Remove existing behavior from Sys
expectvalue /Metaclass3       
doit
Sys removeAllMethods.
Sys class removeAllMethods.
%
! ------------------- Class methods for Sys
! ------------------- Instance methods for Sys
set compile_env: 0
category: 'functions'
method: Sys
byteorder

	^System gemIsBigEndian
		ifTrue: ['big']
		ifFalse: ['little']
%
set compile_env: 0
category: 'other'
method: Sys
initialize
"
	SessionTemps current removeKey: #'Python_Sys' ifAbsent: [].
"
	super initialize.
	dictionary 
		at: #'byteorder'	put: self byteorder;
		yourself.
%
