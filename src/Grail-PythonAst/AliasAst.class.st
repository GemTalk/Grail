"https://docs.python.org/3/library/ast.html#ast.alias

Import name with optional 'as' alias.

name is the identifier being imported.
asname is the optional alias (the name after 'as').

Used in Import and ImportFrom statements.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      AliasAst(name asName)

"
Class {
	#name : 'AliasAst',
	#superclass : 'AbstractLocationNode',
	#instVars : [
		'name',
		'asName'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
AliasAst >> asName [

	^asName

]

{ #category : 'Grail-other' }
AliasAst >> asName: newValue [
	asName := newValue

]

{ #category : 'Grail-other' }
AliasAst >> name [

	^name

]

{ #category : 'Grail-other' }
AliasAst >> name: newValue [
	name := newValue

]

{ #category : 'Grail-other' }
AliasAst >> printOn: aStream [

	super printOn: aStream.
	aStream
		nextPut: $(;
		nextPutAll: name;
		yourself.
	asName ifNotNil: [
		aStream
			nextPutAll: ' as ';
			nextPutAll: asName;
			yourself.
	].
	aStream nextPut: $).

]
