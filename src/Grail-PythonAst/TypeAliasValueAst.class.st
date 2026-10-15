"The right-hand side of a PEP 695 ``type X = V' statement, as an
EXPRESSION node.

It exists so the binding can go through AssignAst.  A type alias binds
its name exactly as an assignment does, and ``exactly as' covers a
long cascade -- module-scope stores route through the module's dynamic
instVars, a ``global' inside a doit goes through the scope handle, a
``nonlocal' inside a class method goes through a setter cell, a
class-body binding becomes a class attribute.  Emitting ``X := ...'
directly reproduced none of it, so a module-level ``type X = int'
compiled to an undefined symbol.

The VALUE is emitted as a THUNK, never evaluated here: PEP 695 makes
``__value__' lazy so an alias may name something defined later, or name
itself.  See TypeAliasType.

"
Class {
	#name : 'TypeAliasValueAst',
	#superclass : 'ExpressionAst',
	#instVars : [
		'aliasName',
		'value'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-IR Codegen' }
TypeAliasValueAst >> ___emitIRValueOn___: aBuilder [
	"``TypeAliasType @env1:___named___: 'X' valueThunk: [V]'' -- V INSIDE A
	BLOCK, so it is not evaluated until __value__ is read.  That laziness is
	the point of the node: ``type X = Undefined'' is legal and only raises when
	the alias is resolved, so emitting V eagerly here would turn a legal
	forward reference into an import-time NameError."

	| thunk |
	thunk := aBuilder inBlockDo: [
		aBuilder add: (value ___emitIRValueOn___: aBuilder)].
	aBuilder atNode: self.
	^ aBuilder
		send: #'___named___:valueThunk:'
		to: (aBuilder globalNamed: #TypeAliasType)
		with: { aBuilder obj: aliasName asString. thunk }
		env: 1

]

{ #category : 'Grail-IR Codegen' }
TypeAliasValueAst >> ___irEligibleValueLocals___: localNames [
	"printSmalltalkOn:'s ``TypeAliasType @env1:___named___: 'X' valueThunk:
	[V]'': the alias NAME is a literal, so only V has to be emittable -- and V
	is judged in the enclosing scope, because the thunk is a Smalltalk block
	over the same temps, exactly as the text's is."

	^ value ___irEligibleValueLocals___: localNames

]

{ #category : 'Grail-IR Codegen' }
TypeAliasValueAst >> ___irReadLocalNamesInto___: aSet locals: localSet [
	"The thunk's body reads in the ENCLOSING scope -- it is a block over the
	same temps, not a new one."

	^ value ___irReadLocalNamesInto___: aSet locals: localSet

]

{ #category : 'Grail-other' }
TypeAliasValueAst >> aliasName [
	^aliasName

]

{ #category : 'Grail-other' }
TypeAliasValueAst >> aliasName: newValue [
	aliasName := newValue

]

{ #category : 'Grail-other' }
TypeAliasValueAst >> printSmalltalkOn: aStream [
	"``TypeAliasType ___named___: 'X' valueThunk: [V]'' -- V inside a
	block, so it is not evaluated until __value__ is read."

	aStream nextPutAll: 'TypeAliasType @env1:___named___: '''.
	aStream nextPutAll: aliasName asString.
	aStream nextPutAll: ''' valueThunk: ['.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ']'

]

{ #category : 'Grail-other' }
TypeAliasValueAst >> printSmalltalkWithParenthesisOn: aStream [
	"A keyword send needs parenthesising wherever it is used as a
	sub-expression."

	aStream nextPut: $(.
	self printSmalltalkOn: aStream.
	aStream nextPut: $)

]

{ #category : 'Grail-other' }
TypeAliasValueAst >> value [
	^value

]

{ #category : 'Grail-other' }
TypeAliasValueAst >> value: newValue [
	value := newValue

]
