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
evaluate: aScope

	(module isKindOf: NoneAst) ifTrue: [		"from ."
		names do: [:each | each import: aScope].
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
		module := None.
	].
	names := self collectAst: [self alias].
	self commaSpace.
	level := (stream upTo: $,) asNumber.
	stream skip: -1.
	self readPosition.
%
