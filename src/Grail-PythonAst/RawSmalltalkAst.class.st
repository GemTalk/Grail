"An expression node that emits a pre-built Smalltalk source string verbatim.

Not produced by the parser -- only synthesised during code generation, where
a consumer needs an ExpressionAst but the value is Smalltalk that another
node already knows how to build."
Class {
	#name : 'RawSmalltalkAst',
	#superclass : 'ExpressionAst',
	#instVars : [
		'source'
	],
	#category : 'Grail-Ast'
}

{ #category : 'Grail-instance creation' }
RawSmalltalkAst class >> source: aString [
	^ self new source: aString; yourself

]

{ #category : 'Grail-code generation' }
RawSmalltalkAst >> printSmalltalkOn: aStream [
	aStream nextPutAll: source

]

{ #category : 'Grail-accessing' }
RawSmalltalkAst >> source [
	^ source

]

{ #category : 'Grail-accessing' }
RawSmalltalkAst >> source: aString [
	source := aString.
	^ self

]
