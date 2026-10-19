"https://docs.python.org/3/library/ast.html#ast.arg

A single argument in a function argument list.

arg is a raw string of the argument name.
annotation is its annotation, such as a Name node.
type_comment is an optional string with the type annotation as a comment.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ArgAst(arg annotation type_comment)

"
Class {
	#name : 'ArgAst',
	#superclass : 'AbstractLocationNode',
	#instVars : [
		'arg',
		'annotation',
		'type_comment'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
ArgAst >> annotation [
	"The parameter's annotation expression AST (or nil).  Read by
	FunctionDefAst when building a function's __annotations__ dict."

	^annotation

]

{ #category : 'Grail-other' }
ArgAst >> annotation: newValue [
	annotation := newValue

]

{ #category : 'Grail-other' }
ArgAst >> arg [
	^arg

]

{ #category : 'Grail-other' }
ArgAst >> arg: newValue [
	arg := newValue

]

{ #category : 'Grail-other' }
ArgAst >> name [

	^arg

]

{ #category : 'Grail-other' }
ArgAst >> printOn: aStream [

	super printOn: aStream.
	aStream
		nextPut: $(;
		nextPutAll: arg;
		nextPut: $);
		yourself.

]

{ #category : 'Grail-other' }
ArgAst >> setTo: anObject scope: aScope [

	aScope set: arg to: anObject.

]

{ #category : 'Grail-other' }
ArgAst >> type_comment [
	^type_comment

]

{ #category : 'Grail-other' }
ArgAst >> type_comment: newValue [
	type_comment := newValue

]
