! ------------------- Remove existing behavior from RaiseAst
expectvalue /Metaclass3
doit
RaiseAst removeAllMethods.
RaiseAst class removeAllMethods.
%
! ------------------- Class methods for RaiseAst
! ------------------- Instance methods for RaiseAst
set compile_env: 0
category: 'other'
method: RaiseAst
initialize
	"Raise(expr? exc, expr? cause)"

	exc := self optionalExpression.
	self commaSpace.
	cause := self optionalExpression.
	self readPosition.
%
category: 'other'
method: RaiseAst
printSmalltalkOn: aStream

aStream 
		nextPutAll: (exc class == CallAst ifTrue: [ exc function id ] ifFalse: [ exc id ]);
		nextPutAll: ' signal';
		yourself.

	(exc class == CallAst) ifTrue: [
		aStream nextPutAll: ': '.
		(cause ~= None and: [cause value ~= nil and: [cause value ~= 'None']]) ifTrue:[ aStream nextPut: '('.].
		self smalltalkSourceFor: (exc arguments at: 1) parenthesisIf: 3 on: aStream.
		aStream nextPutAll: ' ___value'.
		(cause ~= None and: [cause value ~= nil and: [cause value ~= 'None']]) ifTrue:[
			aStream nextPutAll: ', '' The above exception was the direct cause of the following exception: '', ((';
			nextPutAll: (cause class == CallAst ifTrue: [ cause function id ] ifFalse: [ cause id ]).
				(cause class == CallAst) ifTrue: [
					aStream nextPutAll: ' new addText: '.
					self smalltalkSourceFor: (cause arguments at: 1) parenthesisIf: 3 on: aStream.
					aStream nextPutAll: '  ___value'.
				].
			aStream nextPutAll: ') describe))'
		].
	].
(exc class ~= CallAst) ifTrue: [
	(cause ~= None and: [cause value ~= nil and: [cause value ~= 'None']]) ifTrue:[
			aStream nextPutAll: ', '' The above exception was the direct cause of the following exception: '', ((';
			nextPutAll: (cause class == CallAst ifTrue: [ cause function id ] ifFalse: [ cause id ]).
				(cause class == CallAst) ifTrue: [
					aStream nextPutAll: ' new addText: '.
					self smalltalkSourceFor: (cause arguments at: 1) parenthesisIf: 3 on: aStream.
					aStream nextPutAll: '  ___value'.
				].
			aStream nextPutAll: ') describe))'
		].
].

	aStream nextPut: $..
%
