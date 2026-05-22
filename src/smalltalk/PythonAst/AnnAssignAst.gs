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
declareVariable

	target declareVariable.
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
				"Route through the generated setter rather than a bare
				instVar write so block temps (Python parameters) of
				the same name don't shadow the slot."
				(CallAst classAttrNames notNil
					and: [CallAst classAttrNames includes: target attr asSymbol])
					ifTrue: [
						aStream nextPutAll: 'self @env1:'.
						aStream nextPutAll: target attr.
						aStream nextPutAll: ': '.
						value printSmalltalkWithParenthesisOn: aStream.
						aStream nextPut: $..
					] ifFalse: [
						aStream nextPutAll: 'self '.
						aStream nextPutAll: target attr.
						aStream nextPutAll: ': '.
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
	target printSmalltalkOn: aStream.
	aStream nextPutAll: ' := '.
	value printSmalltalkOn: aStream.
	aStream nextPut: $..
%
