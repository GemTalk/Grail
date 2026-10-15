Class {
	#name : 'TypeIgnoreAst',
	#superclass : 'AbstractNode',
	#instVars : [
		'lineno',
		'tag'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
TypeIgnoreAst >> lineno [
	^lineno

]

{ #category : 'Grail-IR Codegen' }
TypeIgnoreAst >> lineno: newValue [
	lineno := newValue

]

{ #category : 'Grail-IR Codegen' }
TypeIgnoreAst >> tag [
	^tag

]

{ #category : 'Grail-IR Codegen' }
TypeIgnoreAst >> tag: newValue [
	tag := newValue

]
