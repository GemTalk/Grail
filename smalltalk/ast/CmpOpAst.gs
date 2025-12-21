! ------------------- Remove existing behavior from CmpOpAst
removeallmethods CmpOpAst
removeallclassmethods CmpOpAst
! ------------------- Class methods for CmpOpAst
category: 'other'
classmethod: CmpOpAst
isAbstract

	^self == CmpOpAst
%
! ------------------- Instance methods for CmpOpAst
category: 'other'
method: CmpOpAst
initialize
	"cmpop = Eq | NotEq | Lt | LtE | Gt | GtE | Is | IsNot | In | NotIn"

	(self stream peekFor: $)) ifFalse: [self error].
%
category: 'other'
method: CmpOpAst
printSmalltalkOn: aStream left: left rightList: right

	right size ~= 1 ifTrue: [
		aStream nextPut: $(.
	].

	left ifNil: [
		aStream nextPutAll: 'rhs'.
	] ifNotNil: [
		 left printSmalltalkWithParenthesisOn: aStream.
	].

	self printSmalltalkOn: aStream.
	right size == 1 ifTrue: [
		right first printSmalltalkWithParenthesisOn: aStream.
	] ifFalse: [
		aStream nextPutAll: '(rhs := '.
		right first printSmalltalkOn: aStream.
		aStream nextPutAll: ')'.
	].
%
