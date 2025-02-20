! ------------------- Remove existing behavior from Variable
removeAllMethods Variable
removeAllClassMethods Variable
! ------------------- Class methods for Variable
! ------------------- Instance methods for Variable
set compile_env: 0
category: 'other'
method: Variable
createChildScope

	^self new; parent: self; yourself
%
category: 'other'
method: Variable
parent: aVariables

	parent := aVariables
%
