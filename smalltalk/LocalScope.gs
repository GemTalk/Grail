! ------------------- Remove existing behavior from LocalScope
expectvalue /Metaclass3       
doit
LocalScope removeAllMethods.
LocalScope class removeAllMethods.
%
! ------------------- Class methods for LocalScope
! ------------------- Instance methods for LocalScope
set compile_env: 0
category: 'other'
method: LocalScope
globals

	^outer globals
%
