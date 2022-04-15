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

	| myScope defaultsOffset |
	myScope := aVariables createChildScope.

	myScope at: vararg put: anArray.
	
	aDictionary keysAndValuesDo: [ :eachKey :eachValue |
		myScope at: eachKey put: eachValue.
	].
	
	defaultsOffset := args size - defaults size.

	(1 to: args size) do: [ :i |
		myScope at: (args at: i) ifAbsent: [
			defaultsOffset + i <= defaults size ifTrue: [
				myScope at: (args at: i) put: (defaults at: i).
			] ifFalse: [
				" Error! "
			].
		].
	].

	^block value: myScope.
%
category: 'other'
method: FunctionDef
vararg: aString

	vararg := aString
%
