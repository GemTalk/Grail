Class {
	#name : 'NamedExprAst',
	#superclass : 'ExpressionAst',
	#instVars : [
		'target',
		'value'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-validation' }
NamedExprAst >> ___annotationScopeOffender___ [
	^ self

]

{ #category : 'Grail-validation' }
NamedExprAst >> ___annotationScopeRefusalName___ [
	^ 'named expression'

]

{ #category : 'Grail-other' }
NamedExprAst >> ___checkNotInClassBodyComprehension___ [
	"PEP 572 forbids a walrus inside a comprehension that sits in a CLASS body,
	and CPython rejects it at COMPILE time:

	    class Foo:
	        [(42, 1 + ((( j := i )))) for i in range(5)]

	    SyntaxError: assignment expression within a comprehension cannot be
	                 used in a class body

	The rule exists because the two scopes disagree about where ``j'' would go:
	a walrus binds in the scope ENCLOSING the comprehension, and that scope is
	a class namespace, which a comprehension cannot write to.  There is no
	answer, so the language refuses the program.

	Grail has no answer either, and used to have no complaint: a class body
	binds no name for a bare expression statement, so the statement was dropped
	whole and the walrus never compiled.  Now that such a statement is emitted,
	``j'' reaches codegen as a bare identifier bound nowhere -- a SMALLTALK
	CompileError (``undefined symbol j'') that kills the whole compile, and
	that Python code cannot catch.  Raise CPython's SyntaxError instead, which
	is both catchable and the right diagnosis (test_named_expressions
	test_named_expression_invalid_in_class_body).

	Walks OUT rather than scanning down, the idiom the rest of the AST uses: a
	FunctionDefAst or LambdaAst between here and the class body ends the walk,
	because a walrus inside a comprehension inside a METHOD is ordinary and
	legal -- the enclosing scope is then the function, not the class."

	| node inComp |
	inComp := false.
	node := parent.
	[node notNil] whileTrue: [
		((node isKindOf: ListCompAst)
			or: [(node isKindOf: SetCompAst)
			or: [(node isKindOf: DictCompAst)
			or: [node isKindOf: GeneratorExpAst]]])
				ifTrue: [inComp := true].
		((node isKindOf: FunctionDefAst) or: [node isKindOf: LambdaAst])
			ifTrue: [^ self].
		((node isKindOf: ClassDefAst) and: [inComp]) ifTrue: [
			^ SyntaxError @env1:___signal___:
				'assignment expression within a comprehension cannot be used in a class body'].
		node := node parent].

]

{ #category : 'Grail-IR Codegen' }
NamedExprAst >> ___emitIRValueOn___: aBuilder [
	"``(x := v)'' as a VALUE: the assignment node itself (an assignment is an
	expression in the IR as in Smalltalk source), or the module store send,
	whose answer is the value put -- exactly what the text parenthesises."

	| v |
	"``nonlocal x; (x := v)'' in a method of a METHOD-LOCAL class: the setter
	cell, as AssignAst >> ___emitIRClassCellStoreOn___:name: writes it -- and
	the setter block answers what it stored, so the send IS the walrus's value.
	Asked before the leaf, as the assignment asks it."
	self ___irClassCellTargetName___ ifNotNil: [:nm |
		| setter |
		CallAst addCapturedWriteName: nm.
		v := value ___emitIRValueOn___: aBuilder.
		aBuilder atNode: self.
		setter := aBuilder
			send: #'___classCellSetter___:' to: aBuilder selfNode
			with: { aBuilder obj: ('___cellSetter_' , nm asString , '___') asSymbol } env: 1.
		^ aBuilder send: #value: to: setter with: { v } env: 0].
	v := value ___emitIRValueOn___: aBuilder.
	aBuilder atNode: self.
	(aBuilder leafFor: target id asSymbol) ifNotNil: [:leaf | ^ aBuilder assign: leaf from: v].
	^ AssignAst new ___emitIRModuleStoreOf___: v to: target on: aBuilder

]

{ #category : 'Grail-other' }
NamedExprAst >> ___emitSmalltalkOn___: aStream [

	"``global x'' makes the walrus target a module binding, and such a
	name has no Smalltalk temp to assign to -- the bare ``x := v'' named
	an undefined symbol and failed the whole method's compile."

	| rhs |
	self ___checkNotInClassBodyComprehension___.
	"PrettyWriteStream, not a bare WriteStream: codegen sends indentation
	protocol (#increaseIndent, #lf) that a plain WriteStream does not
	understand, and the failure shows up as the whole module refusing to
	import rather than as a bad expression."
	rhs := PrettyWriteStream on: Unicode7 new.
	value printSmalltalkOn: rhs.
	"Parenthesised, because a walrus is an EXPRESSION and Smalltalk's
	assignment is not.  Unparenthesised, ``y := 5'' is a statement, and the
	one place a Python expression most often lands is a brace array -- the
	constructor Grail emits for every list, tuple and subscript display:

	    [y := spam(x), x/y]   ->   { y := spam(x). ... }

	which is not a parse error Python code can catch but a SMALLTALK
	CompileError (``unexpected token'') that takes the whole enclosing
	method down.  ``{(y := spam(x)). ...}'' is accepted, and parenthesising
	is harmless everywhere else: an assignment's value is what it assigned,
	so ``(y := 5)'' is the walrus's value in any surrounding expression.
	The module- and class-scope branches emit a keyword send rather than an
	assignment, and those needed the same wrapping for the same reason --
	unparenthesised, the send would swallow whatever followed it."
	aStream nextPut: $(.
	"``nonlocal x; (x := v)'' in a method of a METHOD-LOCAL class writes the
	enclosing function's local through the setter cell ClassDefAst emits --
	AssignAst's class-cell branch.  The bare ``x := v'' below named an
	undeclared temp, so the method failed to compile and every call raised
	``Grail could not compile this method''.  The setter block answers the
	value it stored, so the send is the walrus's value."
	self ___irClassCellTargetName___ ifNotNil: [:nm |
		CallAst addCapturedWriteName: nm.
		aStream
			nextPutAll: '(self @env1:___classCellSetter___: #''___cellSetter_';
			nextPutAll: nm;
			nextPutAll: '___'') value: (';
			nextPutAll: rhs contents;
			nextPutAll: '))'.
		^ self].
	(target isKindOf: NameAst)
		ifTrue: [self emitNameStoreOn: aStream target: target rhs: rhs contents]
		ifFalse: [
			target printSmalltalkOn: aStream.
			aStream nextPutAll: ' := '; nextPutAll: rhs contents].
	aStream nextPut: $).

]

{ #category : 'Grail-IR Codegen' }
NamedExprAst >> ___irClassCellTargetName___ [
	"The target's name when this walrus writes an enclosing function's local
	from inside a method-local class's method, else nil -- the guard of
	AssignAst's and AugAssignAst's class-cell branches."

	^ ((target isKindOf: NameAst)
		and: [CallAst classBeingCompiled notNil
		and: [CallAst inClassBodyValueEmit ~~ true
		and: [CallAst inBasesEmit ~~ true
		and: [target ___enclosingFunctionLocalBeyondClass___: target id]]]])
			ifTrue: [target id]
			ifFalse: [nil]

]

{ #category : 'Grail-IR Codegen' }
NamedExprAst >> ___irEligibleValueLocals___: localNames [
	^ (self ___irWalrusStoreKind___: localNames) notNil
		and: [value ___irEligibleValueLocals___: localNames]

]

{ #category : 'Grail-IR Codegen' }
NamedExprAst >> ___irReadLocalNamesInto___: aSet locals: localSet [
	value ___irReadLocalNamesInto___: aSet locals: localSet.
	^ self

]

{ #category : 'Grail-IR Codegen' }
NamedExprAst >> ___irRefusalDetail___: localSet [
	(target isKindOf: NameAst) ifFalse: [^ ('NamedExprAst:target-' , target class name asString) asSymbol].
	^ #'NamedExprAst:scope'

]

{ #category : 'Grail-IR Codegen' }
NamedExprAst >> ___irWalrusStoreKind___: localNames [
	"#local for a body-local / parameter target (the text's ``(x := v)''),
	#module for a module-scope store target (the text's dynamicInstVarAt:put:,
	which answers the value), #classCell for an enclosing function's local
	written from a method-local class's method (the setter cell), nil for the
	class-body branches (cut 69)."

	(target isKindOf: NameAst) ifFalse: [^ nil].
	self ___irClassCellTargetName___ notNil ifTrue: [^ #classCell].
	(localNames includes: target id asString) ifTrue: [^ #local].
	(self isModuleScopeStoreTarget: target) ifTrue: [^ #module].
	^ nil

]

{ #category : 'Grail-IR Codegen' }
NamedExprAst >> ___irWalrusTargetNames___: localSet [
	"This walrus's own local target, plus any in its value (evaluated
	unconditionally before the binding)."

	| names |
	names := value ___irWalrusTargetNames___: localSet.
	((target isKindOf: NameAst) and: [localSet includes: target id asString])
		ifTrue: [names := names copyWith: target id asString].
	^ names

]

{ #category : 'Grail-IR Codegen' }
NamedExprAst >> ___irWriteLocalNamesInto___: aSet locals: localSet [
	((target isKindOf: NameAst) and: [localSet includes: target id asString])
		ifTrue: [aSet add: target id asString].
	value ___irWriteLocalNamesInto___: aSet locals: localSet.
	^ self

]

{ #category : 'Grail-traceback' }
NamedExprAst >> printSmalltalkOn: aStream [
	"Recorded, then emitted -- see AbstractNode >> ___recordingPrintSmalltalkOn___:."

	^ self ___recordingPrintSmalltalkOn___: aStream

]

{ #category : 'Grail-other' }
NamedExprAst >> target [
	^target

]

{ #category : 'Grail-other' }
NamedExprAst >> target: newValue [
	target := newValue

]

{ #category : 'Grail-other' }
NamedExprAst >> value [
	^value

]

{ #category : 'Grail-other' }
NamedExprAst >> value: newValue [
	value := newValue

]
