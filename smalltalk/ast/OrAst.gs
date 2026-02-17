! ------------------- Superclass check
run
BoolOpAst ifNil: [self error: 'BoolOpAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for OrAst
expectvalue /Class
doit
BoolOpAst subclass: 'OrAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
OrAst comment:
'https://docs.python.org/3/library/ast.html#ast.Or

Boolean operator token for ''or''.

Used as the op field in BoolOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        BoolOpAst(op values)
          OrAst
'
%

expectvalue /Class
doit
OrAst category: 'Parser'
%

! ------------------- Remove existing behavior from OrAst
removeallmethods OrAst
removeallclassmethods OrAst

set compile_env: 0

category: 'other'
method: OrAst
printSmalltalkOn: aStream

	1 to: values size - 1 do: [:i |
		aStream nextPutAll: '(('.
		(values at: i) printSmalltalkOn: aStream.
		aStream nextPutAll: ') or: ['.
	].
	values last printSmalltalkOn: aStream.
	values size - 1 timesRepeat: [
		aStream nextPutAll: '])'.
	].
%
