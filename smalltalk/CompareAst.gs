! ------------------- Remove existing behavior from CompareAst
removeallmethods CompareAst
removeallclassmethods CompareAst
! ------------------- Class methods for CompareAst
! ------------------- Instance methods for CompareAst
category: 'other'
method: CompareAst
initialize
	"Compare(expr left, cmpop* ops, expr* comparators)"

	| stream |
	stream := self stream.
	left := self expression.
	self commaSpace.
	cmpopList := self collectAst: [CmpOpAst parent: self].
	self commaSpace.
	comparatorList := self collectAst: [self expression].
	self readPosition.
%
category: 'other'
method: CompareAst
printSmalltalkOn: aStream
	comparatorList size == cmpopList size ifFalse: [
		"Something bad happens"
	].

	comparatorList size == 1 ifTrue: [
		(cmpopList at: 1) printSmalltalkOn: aStream left: left rightList: comparatorList.
		^self
	].

	aStream
		nextPut: $[;
		lf; tab;
		nextPutAll: '| lhs rhs |'; "lhs is used only by InAst"
		lf; tab;
		"nextPut: $(;"
		yourself.

	(cmpopList at: 1) printSmalltalkOn: aStream left: left rightList: comparatorList.
	2 to: cmpopList size do: [:i |
		aStream nextPutAll: ') __and__: ['.
		(cmpopList at: i) printSmalltalkOn: aStream left: nil rightList: (comparatorList copyFrom: i to: comparatorList size).
	].

	"aStream nextPut: $)." "Used to balance line 21 for last comparison"

	1 to: cmpopList size - 1 do: [:i |
		aStream nextPut: $].
	].

	aStream
		lf;
		nextPutAll: '] value';
		yourself.
%
