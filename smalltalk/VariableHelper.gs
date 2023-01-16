! ------------------- Remove existing behavior from VariableHelper
removeAllMethods VariableHelper
removeAllClassMethods VariableHelper
! ------------------- Class methods for VariableHelper
! ------------------- Instance methods for VariableHelper
set compile_env: 0
category: 'other'
method: VariableHelper
at: aString put: aValue
	"add a variable to the current level of the variables scopes"

	(Python at: #'AllVariables') last at: aString put: aValue.
%
category: 'other'
method: VariableHelper
at: aVarName withHelperSymbols: aIdentitySet 
	"read a variable from the AllVariables global but throw an error if it isn't in aIdentitySet"
	
	(aIdentitySet includes: aVarName)
		ifTrue: [self error]
		ifFalse: [^((Python at: #'AllVariables') reverseDo: [:each |
			|holder|
			holder := each at: aVarName ifAbsent: [].
			holder notNil ifTrue: [^holder].
		])].
%
