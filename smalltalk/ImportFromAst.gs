! ------------------- Remove existing behavior from ImportFromAst
expectvalue /Metaclass3       
doit
ImportFromAst removeAllMethods.
ImportFromAst class removeAllMethods.
%
! ------------------- Class methods for ImportFromAst
! ------------------- Instance methods for ImportFromAst
set compile_env: 0
category: 'other'
method: ImportFromAst
_level
	^ level
%
category: 'other'
method: ImportFromAst
_module
	^ module
%
category: 'other'
method: ImportFromAst
_names
	^ names
%
category: 'other'
method: ImportFromAst
children

	^super children
		addAll: names;
		yourself
%
category: 'other'
method: ImportFromAst
evaluate

	(module isKindOf: NoneAst) ifTrue: [		"from ."
		names do: [:each | each import].
	] ifFalse: [
		self halt.
	].
%
category: 'other'
method: ImportFromAst
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
		module := NoneAst singleton.
	].
	names := self collectAst: [self alias].
	self commaSpace.
	level := (stream upTo: $,) asNumber.
	stream skip: -1.
	self readPosition.
%
