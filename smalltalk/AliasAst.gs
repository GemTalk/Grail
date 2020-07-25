! ------------------- Remove existing behavior from AliasAst
expectvalue /Metaclass3       
doit
AliasAst removeAllMethods.
AliasAst class removeAllMethods.
%
! ------------------- Class methods for AliasAst
! ------------------- Instance methods for AliasAst
set compile_env: 0
category: 'other'
method: AliasAst
asName

	^asName
%
category: 'other'
method: AliasAst
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
		asName := NoneAst singleton.
	].
%
category: 'other'
method: AliasAst
name

	^name
%
