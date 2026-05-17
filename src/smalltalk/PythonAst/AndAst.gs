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
AndAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from AndAst
removeallmethods AndAst
removeallclassmethods AndAst

set compile_env: 0

category: 'Grail-other'
method: AndAst
printSmalltalkOn: aStream
	"Python ``a and b`` returns the first falsy operand (preserving its
	value), or the last operand if all are truthy.  Smalltalk's `and:`
	requires Booleans and returns Boolean, so emit via the
	value-preserving helper ``___pyAnd___:``."

	1 to: values size - 1 do: [:i |
		aStream nextPutAll: '(('.
		(values at: i) printSmalltalkOn: aStream.
		aStream nextPutAll: ') ___pyAnd___: ['.
	].
	values last printSmalltalkOn: aStream.
	values size - 1 timesRepeat: [
		aStream nextPutAll: '])'.
	].
%
