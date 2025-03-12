! ------------------- Remove existing behavior from FunctionDef
removeallmethods FunctionDef
removeallclassmethods FunctionDef
! ------------------- Class methods for FunctionDef
! ------------------- Instance methods for FunctionDef
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
params: anArray

	params := anArray
%
category: 'other'
method: FunctionDef
scope: aVariables positional: positionalArgsArray named: namedArgsArray


	| myScope defaultsOffset |
	myScope := aVariables createChildScope.
	defaultsOffset := params size - defaults size.
	vararg isNil ifFalse: [
		myScope at: vararg put: (list ___value: OrderedCollection new).
	] ifTrue: [
		 positionalArgsArray size < defaultsOffset
			ifTrue: [
				| errorString |
				errorString := ''.
				(positionalArgsArray size + 1) to: params size do: [:i | errorString := errorString, ' ', ((params at: i) asString)].
				TypeError signal:
					'TypeError: missing ', (defaultsOffset - positionalArgsArray size) asString,
					' required positional arguments:', errorString.
			].
	].
	(1 to: positionalArgsArray size) do: [:i |
		i <= params size ifTrue: [
			myScope at: (params at: i) put: (positionalArgsArray at: i).
		] ifFalse: [
			[(myScope at: vararg) append: (positionalArgsArray at: i)]
				on: NameError
				do: [TypeError signal: 'TypeError: takes ', params size asString, ' positional arguements but ', positionalArgsArray size asString, ' was given'].
		].
	].
	positionalArgsArray size < params size ifTrue: [
		| indexOfFirstDefaultNeeded |
		indexOfFirstDefaultNeeded := positionalArgsArray size + defaults size - params size + 1.
		indexOfFirstDefaultNeeded to: defaults size do: [:i |
			myScope at: (params at: defaultsOffset + i) put: (defaults at: i).
		]
	].
	(1 to: kwonlyargs size) do: [:i |
		| namedKeys |
		namedKeys := namedArgsArray collect: [:elem | elem key].
		(namedKeys includes: (kwonlyargs at: i)) ifTrue: [
			| namedValue |
			namedValue := namedArgsArray at: (namedKeys indexOf: (kwonlyargs at: i)).
			myScope at: (kwonlyargs at: i) put: namedValue value.
			namedArgsArray removeValue: namedValue.
		] ifFalse: [
			(kw_defaults at: i) class == NoneType ifTrue: [
				"Error"
			] ifFalse: [
				myScope at: (kwonlyargs at: i) put: (kw_defaults at: i).
			].
		].
	].
	kwarg notNil ifTrue: [
		myScope at: kwarg put: (dict ___value: Dictionary new).
		namedArgsArray do: [:var |
			(myScope at: kwarg) __setitem__: var key _: var value.
		].
	].
	^block value: myScope
%
category: 'other'
method: FunctionDef
vararg: aString

	vararg := aString
%
