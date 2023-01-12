! ------------------- Remove existing behavior from VariableHelper
removeAllMethods VariableHelper
removeAllClassMethods VariableHelper
! ------------------- Class methods for VariableHelper
! ------------------- Instance methods for VariableHelper
set compile_env: 0
category: 'other'
method: VariableHelper
readVariable: aVarName withHelperSymbols: aIdentitySet 
	"read a variable from the AllVariables global but throw an error if it isn't in aIdentitySet"
	
	(aIdentitySet includes: aVarName)
		ifTrue: [^(AllVariables last at: aVarName)]
		ifFalse: [self error].
%
category: 'other'
method: VariableHelper
writeVariable: aString value: aValue
	"add a variable to the current level of the variables scopes"
	AllVariables last at: aString put: aValue.
%
