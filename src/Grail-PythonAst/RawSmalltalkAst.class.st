"An expression node that emits a pre-built Smalltalk source string verbatim.

Not produced by the parser -- only synthesised during code generation, where
a consumer needs an ExpressionAst but the value is Smalltalk that another
node already knows how to build."
Class {
	#name : 'RawSmalltalkAst',
	#superclass : 'ExpressionAst',
	#instVars : [
		'source',
		'importer',
		'alias'
	],
	#category : 'Grail-Ast'
}

{ #category : 'Grail-instance creation' }
RawSmalltalkAst class >> source: aString [
	^ self new source: aString; yourself

]

{ #category : 'Grail-instance creation' }
RawSmalltalkAst class >> source: aString importer: anImport alias: anAlias [
	"The value a class-body ``import'' binds to one alias (ImportAst >>
	classBodyAttributePairs), as its text, plus the import statement that can
	build the same value through IR (plan P3.7)."

	^ (self source: aString) ___importer___: anImport alias: anAlias

]

{ #category : 'Grail-IR Codegen' }
RawSmalltalkAst >> ___emitIRValueOn___: aBuilder [
	"A class-body import's value (plan P3.7): the import statement's own IR
	value for the alias, which is what the text's source spells."

	importer isNil ifTrue: [
		^ self error: 'RawSmalltalkAst: no IR form for a synthesised Smalltalk source'].
	^ importer ___emitIRImportValueFor___: alias on: aBuilder

]

{ #category : 'Grail-code generation' }
RawSmalltalkAst >> ___evaluationIsInert___ [
	"A synthesised operand is a temp the emitter has already bound."

	^ true

]

{ #category : 'Grail-accessing' }
RawSmalltalkAst >> ___importer___: anImport alias: anAlias [

	importer := anImport.
	alias := anAlias

]

{ #category : 'Grail-IR Codegen' }
RawSmalltalkAst >> ___irEligibleValueLocals___: localNames [
	"Only a class-body import's value has an IR form (plan P3.7); any other
	synthesised source is text the IR path cannot spell."

	importer isNil ifTrue: [^ false].
	^ importer ___irImportValueEligibleFor___: alias

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
