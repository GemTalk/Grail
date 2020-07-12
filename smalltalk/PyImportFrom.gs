! ------------------- Remove existing behavior from PyImportFrom
expectvalue /Metaclass3       
doit
PyImportFrom removeAllMethods.
PyImportFrom class removeAllMethods.
%
! ------------------- Class methods for PyImportFrom
! ------------------- Instance methods for PyImportFrom
set compile_env: 0
category: 'other'
method: PyImportFrom
_level
	^ level
%
category: 'other'
method: PyImportFrom
_module
	^ module
%
category: 'other'
method: PyImportFrom
_names
	^ names
%
category: 'other'
method: PyImportFrom
evaluate
	self halt.
%
category: 'other'
method: PyImportFrom
initialize
	"ImportFrom(identifier? module, alias* names, int? level)"

	| stream |
	stream := self stream.
	(stream peekFor: $') ifTrue: [
		module := stream upTo: $'.
		(stream peekFor: $,) ifFalse: [self error].
	] ifFalse: [
		| string |
		string := stream upTo: $,.
		string = 'None' ifFalse: [self error].
	].
	names := self collectAst: [ self alias ].
	self commaSpace.
	level := (stream upTo: $,) asNumber.
	stream skip: -1.
	self readPosition.
%
