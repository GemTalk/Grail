! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for DeleteAst
expectvalue /Class
doit
StatementAst subclass: 'DeleteAst'
  instVarNames: #( targets)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
DeleteAst comment:
'https://docs.python.org/3/library/ast.html#ast.Del

Expression context for deletion (del statement).

Used as the ctx field in Name, Attribute, and Subscript nodes when they appear in a del statement.

Example:
>>> print(ast.dump(ast.parse(''del x''), indent=4))
Module(
    body=[
        Delete(
            targets=[Name(id=''x'', ctx=Del())])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionContextAst
        DeleteAst
'
%

expectvalue /Class
doit
DeleteAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from DeleteAst
removeallmethods DeleteAst
removeallclassmethods DeleteAst
set compile_env: 0

category: 'Grail-Accessing'
method: DeleteAst
targets
	^ targets
%

category: 'Grail-other'
method: DeleteAst
printSmalltalkOn: aStream
	"Generate Smalltalk for `del target1, target2, ...`.

	For each target:
	  * SubscriptAst (del x[key]) → (x) __delitem__: (key)
	  * NameAst (del name) → name := nil
	  * AttributeAst (del obj.attr) → not yet supported, raises error

	See https://docs.python.org/3/reference/simple_stmts.html#the-del-statement"

	targets do: [:target |
		(target isKindOf: SubscriptAst) ifTrue: [
			"del x[key] → (x) __delitem__: (key)"
			aStream nextPut: $(.
			target value printSmalltalkWithParenthesisOn: aStream.
			aStream nextPutAll: ') __delitem__: ('.
			target slice printSmalltalkOn: aStream.
			aStream nextPutAll: ').'.
		] ifFalse: [
			(target isKindOf: NameAst) ifTrue: [
				"del name → name := nil"
				aStream nextPutAll: target id; nextPutAll: ' := nil.'.
			] ifFalse: [
				self error: 'del for ', target class name, ' is not yet supported'
			]
		].
		aStream lf.
	].
%
