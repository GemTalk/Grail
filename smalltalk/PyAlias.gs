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
assign: aValue in: globals
	globals at: self name put: aValue.
%
category: 'other'
method: PyAlias
initialize
	"alias = (identifier name, identifier? asname)"

	| stream |
	stream := self stream.
	name := self string.
	(stream peekFor: $,) ifFalse: [self error].
	stream skipSeparators.
	(stream peekFor: $') ifTrue: [
		asName := stream upTo: $'.
		(stream peekFor: $)) ifFalse: [self error].
	] ifFalse: [
		| string |
		string := stream upTo: $).
		string = 'None' ifFalse: [self error].
	].
%
category: 'other'
method: PyAlias
name

	^name
%
