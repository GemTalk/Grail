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
positional: positionalArray named: namedArray

	| defaultsOffset result vars|

	"for later"
	vars := IdentitySet new.
	AllVariables add: (Dictionary new).

	vararg = #'None' ifFalse: [
		accessVariable at: vararg put: (list ___value: OrderedCollection new).
	].

	defaultsOffset := args size - defaults size.

	(1 to: positionalArray size) do: [ :i |
		i <= args size ifTrue: [
			accessVariable at: (args at: i) put: (positionalArray at: i).
		] ifFalse: [
			defaultsOffset + i <= defaults size ifTrue: [
				accessVariable at: (args at: i) put: (defaults at: i).
			] ifFalse: [
				(accessVariable at: vararg withHelperSymbols: vars) append: (positionalArray at: i).
			].
		].
	].


	(1 to: kwonlyargs size) do: [ :i |
		| namedKeys |
		namedKeys := namedArray collect: [ :elem | elem key ].

		(namedKeys includes: (kwonlyargs at: i)) ifTrue: [
			| namedValue |
			namedValue := namedArray at: (namedKeys indexOf: (kwonlyargs at: i)).
			accessVariable at: (kwonlyargs at: i) put: namedValue value.
			namedArray removeValue: namedValue.
		] ifFalse: [
			(kw_defaults at: i) class = NoneType ifTrue: [
				"Error"
			] ifFalse: [
				accessVariable at: (kwonlyargs at: i) put: (kw_defaults at: i).
			].
		].
	].

	kwarg notNil ifTrue: [

		accessVariable at: kwarg put: (dict ___value: Dictionary new).

		namedArray do: [ :var |
			(accessVariable at: kwarg withHelperSymbols: vars) __setitem__: (str ___value: var key asString) _: var value.
		].
	].

	result := (block value).
	AllVariables remove: (AllVariables last).
	^result.
%
category: 'other'
method: FunctionDef
vararg: aString

	vararg := aString
%
