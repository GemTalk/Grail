! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for AssignAst
expectvalue /Class
doit
StatementAst subclass: 'AssignAst'
  instVarNames: #( targets value type_comment)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
AssignAst comment:
'https://docs.python.org/3/library/ast.html#ast.Assign

An assignment.

targets is a list of nodes (Name, Tuple, List, Attribute, or Subscript).
value is a single node.

Example:
>>> print(ast.dump(ast.parse(''x = y = z = 1''), indent=4))
Module(
    body=[
        Assign(
            targets=[Name(id=''x'', ctx=Store()), Name(id=''y'', ctx=Store()), Name(id=''z'', ctx=Store())],
            value=Constant(value=1))])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        AssignAst(targets value type_comment)'
%

expectvalue /Class
doit
AssignAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from AssignAst
removeallmethods AssignAst
removeallclassmethods AssignAst

set compile_env: 0

category: 'Grail-other'
method: AssignAst
addVariableNamesTo: aStream

	targets do: [:each | 
		each addVariableNamesTo: aStream.
	].
%

category: 'Grail-other'
method: AssignAst
printSmalltalkOn: aStream

	| tgt |
	tgt := targets first.
	(tgt isKindOf: AttributeAst) ifTrue: [
		^self printSmalltalkAttributeStoreOn: aStream target: tgt.
	].
	(tgt isKindOf: SubscriptAst) ifTrue: [
		^self printSmalltalkSubscriptStoreOn: aStream target: tgt.
	].
	tgt printSmalltalkOn: aStream.
	aStream nextPutAll: ' := '.
	value printSmalltalkOn: aStream.
	aStream nextPut: $..
%

category: 'Grail-other'
method: AssignAst
printSmalltalkAttributeStoreOn: aStream target: tgt
	"Generate attribute store.

	When in class method context and target is self.x,
	emit direct instVar assignment: `x := expr.`
	Otherwise: `obj @env0:at: #'attr' put: expr.`"

	((tgt value isKindOf: NameAst) and: [CallAst isSelfReference: tgt value id]) ifTrue: [
		aStream nextPutAll: tgt attr.
		aStream nextPutAll: ' := '.
		value printSmalltalkWithParenthesisOn: aStream.
		aStream nextPut: $..
		^self
	].
	tgt value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' @env0:at: #'''.
	aStream nextPutAll: tgt attr.
	aStream nextPutAll: ''' put: '.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPut: $..
%

category: 'Grail-other'
method: AssignAst
printSmalltalkSubscriptStoreOn: aStream target: tgt
	"Generate: obj __setitem__: slice _: value."

	tgt value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __setitem__: '.
	tgt slice printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' _: '.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPut: $..
%

category: 'Grail-other'
method: AssignAst
target

	^targets at: 1
%
