! ------------------- Remove existing behavior from FunctionDef
removeAllMethods FunctionDef
removeAllClassMethods FunctionDef
! ------------------- Class methods for FunctionDef
! ------------------- Instance methods for FunctionDef
set compile_env: 0
category: 'other'
method: FunctionDef
args: anArray

	args := anArray
%
category: 'other'
method: FunctionDef
block: aBlock

	block := aBlock
%
category: 'other'
method: FunctionDef
defaults: anArray

	defaults := anArray
%
category: 'other'
method: FunctionDef
kw_defaults: anArray

	kw_defaults := anArray
%
category: 'other'
method: FunctionDef
kwarg: aString

	kwarg := aString
%
category: 'other'
method: FunctionDef
kwonlyargs: anArray

	kwonlyargs := anArray
%
category: 'other'
method: FunctionDef
scope: aVariables positional: anArray named: aDictionary

	| myScope |
	myScope := aVariables createChildScope.
	myScope at: #positional put: anArray.
	
	aDictionary do: [ :eachKey :eachValue |
		myScope at: eachKey put: eachValue.
	].

	^block value: myScope.
%
category: 'other'
method: FunctionDef
vararg: aString

	vararg := aString
%
