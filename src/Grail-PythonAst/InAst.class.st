"https://docs.python.org/3/library/ast.html#ast.In

Comparison operator token for membership test (in).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        InAst

"
Class {
	#name : 'InAst',
	#superclass : 'CmpOpAst',
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
InAst >> printSmalltalkOn: aStream [

	self error: 'InAst should be printed via printSmalltalkOn:left:rightList:'.

]

{ #category : 'Grail-other' }
InAst >> printSmalltalkOn: aStream left: left rightList: right rhsTemp: rhsName lhsTemp: lhsName [

	right size == 1 ifTrue: [
		right first printSmalltalkWithParenthesisOn: aStream.
	] ifFalse: [
		aStream nextPutAll: '(((' , lhsName , ' := '.
		(right at: 1) printSmalltalkOn: aStream.
		aStream nextPutAll: ')'.
	].

	aStream nextPutAll: ' ___pyContains___: '.

	left ifNil: [
		aStream nextPutAll: rhsName.
	] ifNotNil: [
		left printSmalltalkWithParenthesisOn: aStream.
	].

	right size ~= 1 ifTrue: [
		"Non-final ``in'' in a chain (`a in B < c`): the container was
		staged in lhsName; after the membership test, copy it into the
		shared chain temp rhsName for the next comparison, then discard
		that assignment's value via ___ignore___: so the expression still
		yields the membership result.  The trailing `)` closes the extra
		`(` opened by the `(((` container prefix above."
		aStream nextPutAll: ') ___ignore___: (' , rhsName , ' := ' , lhsName , '))'.
	]

]
