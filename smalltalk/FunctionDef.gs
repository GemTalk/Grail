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
scope: aVariables positional: positionalArray named: namedArray

	| myScope defaultsOffset |

	myScope := aVariables createChildScope.

	vararg = #'None' ifFalse: [
		myScope at: vararg put: (list ___value: OrderedCollection new).
	].

	defaultsOffset := args size - defaults size.

	(1 to: positionalArray size) do: [ :i |
		i <= args size ifTrue: [
			myScope at: (args at: i) put: (positionalArray at: i).
		] ifFalse: [
			defaultsOffset + i <= defaults size ifTrue: [
				myScope at: (args at: i) put: (defaults at: i).
			] ifFalse: [
				[(myScope at: vararg) append: (positionalArray at: i)]
					on: NameError
					do:[ TypeError signal: 'takes ', (args size) asString, ' positional arguements but ', (positionalArray size) asString, ' was given'].
			].
		].
	].


	(1 to: kwonlyargs size) do: [ :i |
		| namedKeys |
		namedKeys := namedArray collect: [ :elem | elem key ].

		(namedKeys includes: (kwonlyargs at: i)) ifTrue: [
			| namedValue |
			namedValue := namedArray at: (namedKeys indexOf: (kwonlyargs at: i)).
			myScope at: (kwonlyargs at: i) put: namedValue value.
			namedArray removeValue: namedValue.
		] ifFalse: [
			(kw_defaults at: i) class = NoneType ifTrue: [
				"Error"
			] ifFalse: [
				myScope at: (kwonlyargs at: i) put: (kw_defaults at: i).
			].
		].
	].

	kwarg notNil ifTrue: [

		myScope at: kwarg put: (dict ___value: Dictionary new).

		namedArray do: [ :var |
			(myScope at: kwarg) __setitem__: (str ___value: var key asString) _: var value.
		].
	].

	^block value: myScope.
%
category: 'other'
method: FunctionDef
vararg: aString

	vararg := aString
%
