! ------------------- Remove existing behavior from PyAlias
expectvalue /Metaclass3       
doit
PyAlias removeAllMethods.
PyAlias class removeAllMethods.
%
! ------------------- Class methods for PyAlias
! ------------------- Instance methods for PyAlias
set compile_env: 0
category: 'other'
method: PyAlias
_asName
	^ asName
%
category: 'other'
method: PyAlias
_name
	^ name
%
category: 'other'
method: PyAlias
asName

	^asName
%
category: 'other'
method: PyAlias
evaluate

	| function |
	function := (self associationAt: #'__import__') value.
	assoc value: (function value: (Array with: name) value: SymbolDictionary new).
%
category: 'other'
method: PyAlias
initialize
	"alias = (identifier name, identifier? asname)"

	| stream |
	stream := self stream.
	name := self string asSymbol.
	(stream peekFor: $,) ifFalse: [self error].
	stream skipSeparators.
	(stream peekFor: $') ifTrue: [
		(asName := stream upTo: $') asSymbol.
		(stream peekFor: $)) ifFalse: [self error].
	] ifFalse: [
		| string |
		string := stream upTo: $).
		string = 'None' ifFalse: [self error].
		asName := nil.
	].
%
category: 'other'
method: PyAlias
initialize2

	| symbol |
	super initialize2.
	symbol := asName ifNil: [name].
	assoc := self associationAt: symbol.
%
category: 'other'
method: PyAlias
name

	^name
%
