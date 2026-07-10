! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for AnnAssignAst
expectvalue /Class
doit
StatementAst subclass: 'AnnAssignAst'
  instVarNames: #( target annotation value
                    simple)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
AnnAssignAst comment:
'https://docs.python.org/3/library/ast.html#ast.AnnAssign

An assignment with a type annotation.

target is a single node (Name, Attribute or Subscript).
annotation is the annotation, such as a Constant or Name node.
value is a single optional node.
simple is an integer set to 1 for a Name node in target that do not appear in between parenthesis.

Example:
>>> print(ast.dump(ast.parse(''x: int = 3''), indent=4))
Module(
    body=[
        AnnAssign(
            target=Name(id=''x'', ctx=Store()),
            annotation=Name(id=''int'', ctx=Load()),
            value=Constant(value=3),
            simple=1)])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        AnnAssignAst(target annotation value simple)
'
%

expectvalue /Class
doit
AnnAssignAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from AnnAssignAst
removeallmethods AnnAssignAst
removeallclassmethods AnnAssignAst
set compile_env: 0
! ------------------- Class methods for AnnAssignAst
! ------------------- Instance methods for AnnAssignAst

category: 'Grail-accessing'
method: AnnAssignAst
target
	^ target
%

category: 'Grail-accessing'
method: AnnAssignAst
annotation
	^ annotation
%

category: 'Grail-accessing'
method: AnnAssignAst
value
	^ value
%

category: 'Grail-accessing'
method: AnnAssignAst
simple
	^ simple
%

category: 'Grail-other'
method: AnnAssignAst
printSmalltalkOn: aStream
	"``x: int = expr`` → emit the assignment, drop the annotation.
	Grail doesn't materialize __annotations__; the annotation is
	preserved in the AST for tools that inspect it, but at codegen
	we only care about the value path.
	``x: int`` (no value) is a pure annotation — no assignment,
	just record the name as a declared variable so later reads
	resolve cleanly.

	Target shapes are the same three AssignAst handles: NameAst
	(plain `x := expr.`), AttributeAst (`obj.attr = expr` →
	setter or instVar), and SubscriptAst (`xs[i] = expr` →
	__setitem__)."

	value isNil ifTrue: [^ self].
	(target isKindOf: AttributeAst) ifTrue: [
		((target value isKindOf: NameAst)
			and: [CallAst isSelfReference: target value id])
			ifTrue: [
				"Phase B: ``self.attr: T = value'' annotated store on a
				self-reference goes through the instance's dynamic-instVar
				storage.  Class-side attrs (in classAttrNames) still use
				the synthesized env-1 setter because class objects can't
				hold dynamic instVars."
				(CallAst classAttrNames notNil
					and: [CallAst classAttrNames includes: target attr asSymbol])
					ifTrue: [
						aStream nextPutAll: 'self @env1:'.
						aStream nextPutAll: target attr.
						aStream nextPutAll: ': '.
						value printSmalltalkWithParenthesisOn: aStream.
						aStream nextPut: $..
					] ifFalse: [
						aStream nextPutAll: 'self @env0:dynamicInstVarAt: #'''.
						aStream nextPutAll: target attr.
						aStream nextPutAll: ''' put: '.
						value printSmalltalkWithParenthesisOn: aStream.
						aStream nextPut: $..
					].
			] ifFalse: [
				target value printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: ' @env1:'.
				aStream nextPutAll: target attr.
				aStream nextPutAll: ': '.
				value printSmalltalkWithParenthesisOn: aStream.
				aStream nextPut: $..
			].
		^ self
	].
	(target isKindOf: SubscriptAst) ifTrue: [
		target value printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: ' __setitem__: '.
		target slice printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: ' _: '.
		value printSmalltalkWithParenthesisOn: aStream.
		aStream nextPut: $..
		^ self
	].
	"Phase A: module-scope plain NameAst target writes through the
	module instance's dynamic-instVar storage rather than a bare
	assignment (no static instVar slot exists for the name)."
	((target isKindOf: NameAst) and: [self isModuleScopeAnnTarget: target])
		ifTrue: [
			aStream
				nextPutAll: self ___moduleStoreReceiverExpr___;
				nextPutAll: ' @env0:dynamicInstVarAt: #''';
				nextPutAll: target id;
				nextPutAll: ''' put: '.
			value printSmalltalkWithParenthesisOn: aStream.
			aStream nextPut: $..
			^ self
		].
	target printSmalltalkOn: aStream.
	aStream nextPutAll: ' := '.
	value printSmalltalkOn: aStream.
	aStream nextPut: $..
%

category: 'Grail-other'
method: AnnAssignAst
isModuleScopeAnnTarget: aNameAst
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
%

category: 'Grail-Class Body'
method: AnnAssignAst
___boundTargetNames___
	"Symbol bound by this annotated assignment (Name target only)."

	(target isKindOf: NameAst) ifTrue: [^ OrderedCollection with: target id asSymbol].
	^ OrderedCollection new
%
