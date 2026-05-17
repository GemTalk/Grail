! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for SetAst
expectvalue /Class
doit
ExpressionAst subclass: 'SetAst'
  instVarNames: #( elts)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
SetAst comment:
'https://docs.python.org/3/library/ast.html#ast.Set

A set.

elts holds a list of nodes representing the set''s elements.

Example:
>>> print(ast.dump(ast.parse(''{1, 2, 3}'', mode=''eval''), indent=4))
Expression(
    body=Set(
        elts=[Constant(value=1), Constant(value=2), Constant(value=3)]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        SetAst(elts)
'
%

expectvalue /Class
doit
SetAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from SetAst
removeallmethods SetAst
removeallclassmethods SetAst

set compile_env: 0

category: 'Grail-other'
method: SetAst
printSmalltalkOn: aStream

	aStream nextPutAll: '([:___s | '.
	elts do: [:each |
		aStream nextPutAll: '___s add: '.
		each printSmalltalkOn: aStream.
		aStream nextPutAll: '. '.
	].
	aStream nextPutAll: '___s] value: (set perform: #new env: 0))'.
%
