"https://docs.python.org/3/library/ast.html#ast.AnnAssign

An assignment with a type annotation.

target is a single node (Name, Attribute or Subscript).
annotation is the annotation, such as a Constant or Name node.
value is a single optional node.
simple is an integer set to 1 for a Name node in target that do not appear in between parenthesis.

Example:
>>> print(ast.dump(ast.parse('x: int = 3'), indent=4))
Module(
    body=[
        AnnAssign(
            target=Name(id='x', ctx=Store()),
            annotation=Name(id='int', ctx=Load()),
            value=Constant(value=3),
            simple=1)])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        AnnAssignAst(target annotation value simple)

"
Class {
	#name : 'AnnAssignAst',
	#superclass : 'StatementAst',
	#instVars : [
		'target',
		'annotation',
		'value',
		'simple'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-other' }
AnnAssignAst >> ___addKeyPartsOf___: aKey to: aCollection [
	"codegen_check_ann_subscr (Python/codegen.c:5458-5487): a slice adds the
	bounds it has, an extended slice each element in turn, any other key
	itself."

	(aKey isKindOf: SliceAst) ifTrue: [
		{ aKey lower. aKey upper. aKey step } do: [:bound |
			bound ifNotNil: [:present | aCollection add: present]].
		^ self].
	(aKey isKindOf: TupleAst) ifTrue: [
		aKey elts do: [:element | self ___addKeyPartsOf___: element to: aCollection].
		^ self].
	aCollection add: aKey

]

{ #category : 'Grail-Annotations' }
AnnAssignAst >> ___addScopeAnnotationsTo___: aCollection [
	"Only a simple annotation is one of its scope's annotated names."

	self ___isSimpleAnnotation___ ifTrue: [aCollection add: self]

]

{ #category : 'Grail-Class Body' }
AnnAssignAst >> ___boundTargetNames___ [
	"Symbol bound by this annotated assignment (Name target only)."

	(target isKindOf: NameAst) ifTrue: [
		^ OrderedCollection with: target ___mangledId___ asSymbol].
	^ OrderedCollection new

]

{ #category : 'Grail-Annotations' }
AnnAssignAst >> ___emitAnnotateEntryOn___: aStream [
	"This name's entry in its scope's annotate function, evaluated in the format
	the function was called with (PyAnnotate >> ___annotationValue___:source:format:)."

	aStream
		nextPutAll: '___annotations___ @env0:at: ''';
		nextPutAll: target id asString;
		nextPutAll: ''' put: (PyAnnotate @env1:___annotationValue___: ['.
	annotation printSmalltalkOn: aStream.
	aStream nextPutAll: '] source: '.
	self emitStringLiteral: annotation ___annotationSourceString___ on: aStream.
	aStream nextPutAll: ' format: (___annArgs___ @env0:at: 1)).'

]

{ #category : 'Grail-Annotations' }
AnnAssignAst >> ___emitExecutionRecordOn___: aStream [
	"Record that this annotation ran, where its scope keeps that record."

	self ___isSimpleAnnotation___ ifTrue: [self ___emitExecutionRecordOf___: self on: aStream]

]

{ #category : 'Grail-IR Codegen' }
AnnAssignAst >> ___emitIRStatementOn___: aBuilder [
	| v |
	value isNil ifTrue: [
		self ___targetChecks___ do: [:check | check ___emitIRStatementOn___: aBuilder].
		^ self].
	(target isKindOf: AttributeAst) ifTrue: [
		^ self ___plainAssign___ ___emitIRStatementOn___: aBuilder].
	(target isKindOf: SubscriptAst) ifTrue: [
		^ self ___plainAssign___ ___emitIRStatementOn___: aBuilder].
	v := value ___emitIRValueOn___: aBuilder.
	aBuilder atNode: self.
	aBuilder add: (aBuilder assign: (aBuilder leafFor: target id asSymbol) from: v).
	^ self

]

{ #category : 'Grail-IR Codegen' }
AnnAssignAst >> ___irEligibleStatementLocals___: localNames [
	"printSmalltalkOn:'s shapes (cut 52): the annotation is never evaluated;
	a def-local ``x: T = v'' is ``x := v''; ``self.attr: T = v'' writes the
	instance's dynamic-instVar storage (or the class-side setter for a name in
	classAttrNames); a foreign ``obj.attr: T = v'' is the setter send; a
	subscript is __setitem__.  An attribute target is its AssignAst's
	(___plainAssign___).  A pure annotation (no value) emits nothing.  A
	module-scope Name target (a global-declared name) stays on text.  With no
	value an attribute or subscript target still evaluates its parts
	(___targetChecks___)."

	value isNil ifTrue: [
		^ self ___targetChecks___ allSatisfy: [:check |
			check ___irEligibleStatementLocals___: localNames]].
	(value ___irEligibleValueLocals___: localNames) ifFalse: [^ false].
	(target isKindOf: NameAst) ifTrue: [
		(self isModuleScopeAnnTarget: target) ifTrue: [^ false].
		^ localNames includes: target id asString].
	(target isKindOf: AttributeAst) ifTrue: [
		^ self ___plainAssign___ ___irEligibleStatementLocals___: localNames].
	(target isKindOf: SubscriptAst) ifTrue: [
		^ (target value ___irEligibleValueLocals___: localNames)
			and: [target slice ___irEligibleValueLocals___: localNames]].
	^ false

]

{ #category : 'Grail-IR Codegen' }
AnnAssignAst >> ___irLocalWriteTarget___: localSet [
	"The Name target when the statement binds a def-local (it has a value)."

	value isNil ifTrue: [^ nil].
	((target isKindOf: NameAst) and: [localSet includes: target id asString])
		ifTrue: [^ target].
	^ nil

]

{ #category : 'Grail-IR Codegen' }
AnnAssignAst >> ___irReadLocalNamesInto___: aSet locals: localSet [
	"The value, and the receiver / index of an attribute or subscript target;
	the annotation is never evaluated.  With no value, what ___targetChecks___
	evaluates."

	value isNil ifTrue: [
		self ___targetChecks___ do: [:check |
			check ___irReadLocalNamesInto___: aSet locals: localSet].
		^ self].
	value ___irReadLocalNamesInto___: aSet locals: localSet.
	(target isKindOf: AttributeAst) ifTrue: [
		target value ___irReadLocalNamesInto___: aSet locals: localSet].
	(target isKindOf: SubscriptAst) ifTrue: [
		target value ___irReadLocalNamesInto___: aSet locals: localSet.
		target slice ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self

]

{ #category : 'Grail-IR Codegen' }
AnnAssignAst >> ___irRefusalDetail___: localSet [
	(value notNil and: [target isKindOf: AttributeAst]) ifTrue: [
		^ self ___plainAssign___ ___irRefusalDetail___: localSet].
	((target isKindOf: NameAst) and: [self isModuleScopeAnnTarget: target])
		ifTrue: [^ #'AnnAssignAst:moduleTarget'].
	^ #'AnnAssignAst:target'

]

{ #category : 'Grail-IR Codegen' }
AnnAssignAst >> ___irWriteLocalNamesInto___: aSet locals: localSet [
	(self ___irLocalWriteTarget___: localSet) ifNotNil: [:t | aSet add: t id asString].
	^ self

]

{ #category : 'Grail-other' }
AnnAssignAst >> ___isModuleLevelFinal___ [
	"Is this ``name: Final = value'' (or ``Final[T]'', ``typing.Final'')
	directly at module level -- not in a def, a lambda or a class body?
	Those are the bindings GemDB initializes ONCE
	(docs/App_Namespaces_Design.md §5.4): see printSmalltalkOn:."

	| ann node |
	value isNil ifTrue: [^ false].
	(target isKindOf: NameAst) ifFalse: [^ false].
	ann := annotation.
	(ann isKindOf: SubscriptAst) ifTrue: [ann := ann value].
	(((ann isKindOf: NameAst) and: [ann id asString = 'Final'])
		or: [(ann isKindOf: AttributeAst) and: [ann attr asString = 'Final']])
			ifFalse: [^ false].
	node := parent.
	[node notNil] whileTrue: [
		((node isKindOf: FunctionDefAst) or: [(node isKindOf: LambdaAst)
			or: [node isKindOf: ClassDefAst]]) ifTrue: [^ false].
		node := node parent].
	^ true

]

{ #category : 'Grail-accessing' }
AnnAssignAst >> ___isSimpleAnnotation___ [
	"Does this statement contribute to its scope's __annotations__?  Only a
	bare name, unparenthesised -- ``x: int'', not ``(x): int'' or ``a.b:
	int'' (ast.AnnAssign.simple).  nil counts as simple: a node built without
	the parser's flag is the ordinary case."

	^ (target isKindOf: NameAst) and: [simple ~= 0]

]

{ #category : 'Grail-other' }
AnnAssignAst >> ___plainAssign___ [
	"``obj.attr: T = v'' stores exactly as ``obj.attr = v'' does, and
	``xs[i]: T = v'' as ``xs[i] = v'', so both are emitted BY the AssignAst for
	that statement rather than by a second copy of its store cascade.  That
	includes the order: the value first, then the target (Python/codegen.c:5481,
	codegen_annassign's ``We perform the actual assignment first'').

	The copy had drifted.  A foreign receiver compiled to the bare setter send
	``obj @env1:attr: v'', which stored nothing on an ordinary instance and
	raised nothing either: ``c.new_attr: int = 10'' followed by
	``c.new_attr'' was an AttributeError (test.typinganndata.ann_module2,
	which test_typing imports).  A self receiver went straight to
	dynamicInstVarAt:put:, skipping a @property setter and a __setattr__
	override -- both of which AssignAst routes through __setattr__:_:.

	Built per call and parented under this node, so every scope walk from the
	target still passes through here to the enclosing def or class."

	| assign |
	assign := AssignAst new
		targets: (Array with: target);
		value: value;
		yourself.
	assign
		beginLine: self beginLine;
		beginPosition: self beginPosition;
		endLine: self endLine;
		endPosition: self endPosition.
	assign setParent: self.
	^ assign

]

{ #category : 'Grail-other' }
AnnAssignAst >> ___statementEvaluating___: anExpression [
	"An expression statement that evaluates anExpression for effect, located
	and parented as this statement, as ___plainAssign___'s assignment is."

	| statement |
	statement := ExprAst new
		value: anExpression;
		yourself.
	statement
		beginLine: self beginLine;
		beginPosition: self beginPosition;
		endLine: self endLine;
		endPosition: self endPosition.
	statement setParent: self.
	^ statement

]

{ #category : 'Grail-other' }
AnnAssignAst >> ___targetChecks___ [
	"What an annotated ATTRIBUTE or SUBSCRIPT with no value still evaluates,
	as expression statements whose values are discarded: the attribute's
	object, or the subscript's object and the parts of its key.  CPython's
	codegen_annassign (Python/codegen.c:5534-5546) does that through
	codegen_check_ann_expr / codegen_check_ann_subscr, ``everything in a
	subscript is defined at runtime''.  So ``no_such.attr: int'' raises
	NameError, where Grail evaluated nothing at all.

	Empty with a value -- the assignment evaluates the target -- and for a
	name.  Built per call, as ___plainAssign___ is."

	| parts |
	value isNil ifFalse: [^ #()].
	parts := OrderedCollection new.
	(target isKindOf: AttributeAst) ifTrue: [parts add: target value].
	(target isKindOf: SubscriptAst) ifTrue: [
		parts add: target value.
		self ___addKeyPartsOf___: target slice to: parts].
	^ parts collect: [:each | self ___statementEvaluating___: each]

]

{ #category : 'Grail-accessing' }
AnnAssignAst >> annotation [
	^ annotation

]

{ #category : 'Grail-Class Body' }
AnnAssignAst >> annotation: newValue [
	annotation := newValue

]

{ #category : 'Grail-Class Body' }
AnnAssignAst >> classBodyAttributePairs [
	"``name -> valueAst'' pair for an annotated assignment in a CLASS BODY.

	``x: int = 5'' strips the annotation and behaves as a plain class
	attribute.  A BARE annotation (``x: int'', no value) also materialises a
	class-side slot, with a nil initializer: those are commonly
	forward-declared placeholders assigned from outside the body later
	(Jinja2's ``Environment.template_class = Template'')."

	(target isKindOf: NameAst) ifFalse: [^ #()].
	"Private-name mangled, as AssignAst's pairs are."
	^ Array with: target ___mangledId___ asSymbol -> value

]

{ #category : 'Grail-other' }
AnnAssignAst >> isModuleScopeAnnTarget: aNameAst [
	"Phase A: true if this annotated-assign target is a module-scope
	name — same discriminator as AssignAst's isModuleScopeStoreTarget:."

	CallAst moduleClassBeingCompiled ifNil: [^ false].
	"``global x'' in the nearest enclosing function forces the module
	route -- even inside a class method (the emitters pick the module-
	instance receiver via ___moduleStoreReceiverExpr___) and past any
	enclosing-function shadow (Python: the declaration binds the name
	to the module for the whole declaring scope)."
	(aNameAst ___nearestEnclosingFunctionDeclaresGlobal___: aNameAst id)
		ifTrue: [^ true].
	CallAst classBeingCompiled ifNotNil: [^ false].
	(aNameAst isModuleVariableName: aNameAst id) ifFalse: [^ false].
	"PRECISE local-shadow check (writes + params; comprehension targets
	and global-declared names excluded) -- not the over-approximating
	___declaredInEnclosingFunction___: variables walk."
	(aNameAst ___pythonLocalInEnclosingFunctions___: aNameAst id) ifTrue: [^ false].
	^ true

]

{ #category : 'Grail-other' }
AnnAssignAst >> printSmalltalkOn: aStream [
	"``x: int = expr`` → emit the assignment, drop the annotation.
	Grail doesn't materialize __annotations__; the annotation is
	preserved in the AST for tools that inspect it, but at codegen
	we only care about the value path.
	``x: int`` (no value) is a pure annotation — no assignment,
	just record the name as a declared variable so later reads
	resolve cleanly.

	Target shapes are the same three AssignAst handles: NameAst
	(plain `x := expr.`), AttributeAst (`obj.attr = expr`) and
	SubscriptAst (`xs[i] = expr` → __setitem__).  An attribute or
	subscript target IS an AssignAst -- see ___plainAssign___.

	A simple annotation then records that it ran, where its module or class
	keeps that record (___emitExecutionRecordOn___:) -- after the store, which
	is CPython's order too (Python/codegen.c:5481-5523)."

	value isNil ifTrue: [
		self ___targetChecks___ do: [:check | check printSmalltalkOn: aStream].
		^ self ___emitExecutionRecordOn___: aStream].
	(target isKindOf: AttributeAst) ifTrue: [
		^ self ___plainAssign___ printSmalltalkOn: aStream].
	(target isKindOf: SubscriptAst) ifTrue: [
		^ self ___plainAssign___ printSmalltalkOn: aStream].
	"A name bound by a class-body for / while / try / with / match, which
	ClassDefAst emits verbatim: a class attribute, which AssignAst stores
	through the class (isClassBodyRuntimeStoreTarget:).  The bare ``x := 1''
	below named an undeclared variable there, so the whole module failed to
	compile (test_type_annotations TestSetupAnnotations)."
	self ___inClassBodyRuntimeScope___ ifTrue: [
		self ___plainAssign___ printSmalltalkOn: aStream.
		^ self ___emitExecutionRecordOn___: aStream].
	"Phase A: module-scope plain NameAst target writes through the
	module instance's dynamic-instVar storage rather than a bare
	assignment (no static instVar slot exists for the name)."
	"``app: Final = Flask(__name__)'' at module level is initialized ONCE
	(docs/App_Namespaces_Design.md §5.4): when the module's globals are
	persistent and already hold the name, the committed value stays and the
	right-hand side is not evaluated -- Clojure's defonce.  So a re-run of an
	app's top file writes nothing for it, and several sessions starting the
	app cannot conflict on it.  Where the globals start empty, as every
	CPython run's do, the statement runs as written."
	((target isKindOf: NameAst) and: [self isModuleScopeAnnTarget: target])
		ifTrue: [
			self ___isModuleLevelFinal___ ifTrue: [
				aStream
					nextPutAll: '(';
					nextPutAll: self ___moduleStoreReceiverExpr___;
					nextPutAll: ' @env0:___finalIsBound___: #''';
					nextPutAll: target id;
					nextPutAll: ''') ifFalse: ['].
			aStream
				nextPutAll: self ___moduleStoreReceiverExpr___;
				nextPutAll: ' @env0:dynamicInstVarAt: #''';
				nextPutAll: target id;
				nextPutAll: ''' put: '.
			value printSmalltalkWithParenthesisOn: aStream.
			self ___isModuleLevelFinal___ ifTrue: [aStream nextPut: $]].
			aStream nextPut: $..
			^ self ___emitExecutionRecordOn___: aStream
		].
	target printSmalltalkOn: aStream.
	aStream nextPutAll: ' := '.
	value printSmalltalkOn: aStream.
	aStream nextPut: $..
	self ___emitExecutionRecordOn___: aStream

]

{ #category : 'Grail-accessing' }
AnnAssignAst >> simple [
	^ simple

]

{ #category : 'Grail-Class Body' }
AnnAssignAst >> simple: newValue [
	simple := newValue

]

{ #category : 'Grail-accessing' }
AnnAssignAst >> target [
	^ target

]

{ #category : 'Grail-Class Body' }
AnnAssignAst >> target: newValue [
	target := newValue

]

{ #category : 'Grail-accessing' }
AnnAssignAst >> value [
	^ value

]

{ #category : 'Grail-Class Body' }
AnnAssignAst >> value: newValue [
	value := newValue

]
