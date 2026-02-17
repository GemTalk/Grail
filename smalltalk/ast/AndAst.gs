! ------------------- Superclass check
run
BoolOpAst ifNil: [self error: 'BoolOpAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for AndAst
expectvalue /Class
doit
BoolOpAst subclass: 'AndAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
AndAst comment:
'https://docs.python.org/3/library/ast.html#ast.And

Boolean operator token for ''and''.

Used as the op field in BoolOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        BoolOpAst(op values)
          AndAst
'
%

expectvalue /Class
doit
AndAst category: 'Parser'
%

! ------------------- Remove existing behavior from AndAst
removeallmethods AndAst
removeallclassmethods AndAst

set compile_env: 0

category: 'other'
method: AndAst
printSmalltalkOn: aStream

	1 to: values size - 1 do: [:i |
		aStream nextPutAll: '(('.
		(values at: i) printSmalltalkOn: aStream.
		aStream nextPutAll: ') and: ['.
	].
	values last printSmalltalkOn: aStream.
	values size - 1 timesRepeat: [
		aStream nextPutAll: '])'.
	].
%
