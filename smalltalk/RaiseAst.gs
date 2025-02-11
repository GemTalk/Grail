! ------------------- Remove existing behavior from RaiseAst
removeallmethods RaiseAst
removeallclassmethods RaiseAst
! ------------------- Class methods for RaiseAst
! ------------------- Instance methods for RaiseAst
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
			nextPutAll: (exc class == CallAst ifTrue: [exc function id] ifFalse: [exc id]);
			nextPutAll: ' signal';
			yourself.

	exc class == CallAst ifTrue: [
		aStream nextPutAll: ': '.
		(cause ~= None and: [cause value ~= nil and: [cause value ~= 'None']]) ifTrue: [aStream nextPut: '('.].
		exc arguments first printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: ' ___value'.
		(cause ~= None and: [cause value ~= nil and: [cause value ~= 'None']]) ifTrue: [
			aStream nextPutAll: ', '' The above exception was the direct cause of the following exception: '', ((';
			nextPutAll: (cause class == CallAst ifTrue: [cause function id] ifFalse: [cause id]).
				(cause class == CallAst) ifTrue: [
					aStream nextPutAll: ' new addText: '.
					cause arguments first printSmalltalkWithParenthesisOn: aStream.
					aStream nextPutAll: '  ___value'.
				].
			aStream nextPutAll: ') describe))'
		].
	] ifFalse: [
		(cause ~= None and: [cause value ~= nil and: [cause value ~= 'None']]) ifTrue: [
				aStream nextPutAll: ', '' The above exception was the direct cause of the following exception: '', ((';
				nextPutAll: (cause class == CallAst ifTrue: [cause function id] ifFalse: [cause id]).
					cause class == CallAst ifTrue: [
						aStream nextPutAll: ' new addText: '.
						cause arguments first printSmalltalkWithParenthesisOn: aStream.
						aStream nextPutAll: '  ___value'.
					].
				aStream nextPutAll: ') describe))'.
			].
	].
	aStream nextPut: $..
%
