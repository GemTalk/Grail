! ------------------- Remove existing behavior from ListAst
removeallmethods ListAst
removeallclassmethods ListAst
set compile_env: 0
! ------------------- Class methods for ListAst
! ------------------- Instance methods for ListAst
category: 'other'
method: ListAst
printSmalltalkOn: aStream

	elts isEmpty ifTrue: [
		aStream nextPutAll: '(OrderedCollection perform: #new env: 0)'.
		^self.
	].
	aStream nextPutAll: '({'.
	elts doWithIndex: [:each :i |
		i > 1 ifTrue: [aStream nextPutAll: '. '].
		each printSmalltalkOn: aStream.
	].
	aStream nextPutAll: '} perform: #asOrderedCollection env: 0)'.
%
