! ------------------- Remove existing behavior from DictAst
expectvalue /Metaclass3
doit
DictAst removeAllMethods.
DictAst class removeAllMethods.
%
! ------------------- Class methods for DictAst
! ------------------- Instance methods for DictAst
set compile_env: 0
category: 'other'
method: DictAst
initialize
	"Dict(expr* keys, expr* values)"

	keys := self collectAst: [self expression].
	self commaSpace.
	values := self collectAst: [self expression].
	self readPosition.
%
category: 'other'
method: DictAst
messagePrecedence
	
	^3
%
category: 'other'
method: DictAst
printSmalltalkOn: aStream

	aStream nextPutAll: 'dict ___value: { '.
	keys with: values do: [ :key :value |
		self smalltalkSourceFor: key parenthesisIf: 1 on: aStream.
		aStream nextPutAll: '->'.
		self smalltalkSourceFor: value parenthesisIf: 1 on: aStream.
		aStream nextPutAll: '. '.
	].
	aStream nextPutAll: '} asDictionary'.
%
