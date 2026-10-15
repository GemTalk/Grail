"https://docs.python.org/3/library/ast.html#ast.ExceptHandler

An exception handler in a try statement.

type is the exception type to catch (can be None for bare except).
name is the optional identifier to bind the exception to.
body is a list of statements in the exception handler.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExceptHandlerAst(type name body)

"
Class {
	#name : 'ExceptHandlerAst',
	#superclass : 'AbstractLocationNode',
	#instVars : [
		'type',
		'name',
		'body',
		'isStar'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
ExceptHandlerAst >> body [

	^body

]

{ #category : 'Grail-other' }
ExceptHandlerAst >> body: newValue [
	body := newValue

]

{ #category : 'Grail-accessing' }
ExceptHandlerAst >> isStar [
	"True for a PEP 654 ``except*'' clause.

	The two forms cannot be mixed in one try -- CPython rejects that at
	compile time -- and their semantics differ enough that TryAst emits a
	wholly separate shape for a star try: every matching clause runs
	against a SPLIT of the raised group, rather than the first match
	winning."

	^ isStar == true

]

{ #category : 'Grail-accessing' }
ExceptHandlerAst >> isStar: aBoolean [
	isStar := aBoolean

]

{ #category : 'Grail-other' }
ExceptHandlerAst >> name [

	^name

]

{ #category : 'Grail-other' }
ExceptHandlerAst >> name: newValue [
	name := newValue

]

{ #category : 'Grail-initialization' }
ExceptHandlerAst >> setParent: aNode [

	super setParent: aNode.
	name ifNotNil: [
		self declareVariable: name.
	].

]

{ #category : 'Grail-other' }
ExceptHandlerAst >> type [

	^type

]

{ #category : 'Grail-other' }
ExceptHandlerAst >> type: newValue [
	type := newValue

]
