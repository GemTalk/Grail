! ------------------- Remove existing behavior from PySystem
expectvalue /Metaclass3       
doit
PySystem removeAllMethods.
PySystem class removeAllMethods.
%
! ------------------- Class methods for PySystem
set compile_env: 0
category: 'other'
classmethod: PySystem
new

	^self basicNew
		initialize;
		yourself
%
! ------------------- Instance methods for PySystem
set compile_env: 0
category: 'other'
method: PySystem
initialize

	modules := KeyValueDictionary new.
%
category: 'other'
method: PySystem
modules

	^modules
%
category: 'other'
method: PySystem
sys

	^self
%
