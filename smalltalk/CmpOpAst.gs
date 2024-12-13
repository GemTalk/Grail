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
		self smalltalkSourceFor: left parenthesisIf: 3 on: aStream.
	].

	self printSmalltalkOn: aStream.
	right size == 1 ifTrue: [
		self smalltalkSourceFor: (right at: 1) parenthesisIf: 3 on: aStream.
	] ifFalse: [
		aStream nextPutAll: '(rhs := '.
		self smalltalkSourceFor: (right at: 1) parenthesisIf: 4 on: aStream.
		aStream nextPutAll: ')'.
	].
%
