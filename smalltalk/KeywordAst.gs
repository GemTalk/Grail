! ------------------- Remove existing behavior from KeywordAst
expectvalue /Metaclass3
doit
KeywordAst removeAllMethods.
KeywordAst class removeAllMethods.
%
! ------------------- Class methods for KeywordAst
! ------------------- Instance methods for KeywordAst
set compile_env: 0
category: 'other'
method: KeywordAst
initialize
	"keyword = (identifier? arg, expr value)"
	| next stream |
	stream := self stream.
	next := stream next: 8.
	next ~= 'keyword(' ifTrue: [self error].
	next := stream peekN: 4.
	next = 'None' ifTrue: [
		stream next: 4.
		arg := nil.
	] ifFalse: [
		arg := self string asSymbol.
	].
	"(stream peekFor: $') ifTrue: [
		arg := str withAll: (stream upTo: $').
	] ifFalse: [
		next := stream peekN: 4.
		next = 'None' ifTrue: [
			stream next: 4.
			arg := nil.
		] ifFalse: [
			self error.
		].
	]."
	self commaSpace.
	value := self expression.
    self readPosition.
%
category: 'other'
method: KeywordAst
name

	^arg
%
category: 'other'
method: KeywordAst
value

	^value
%
