! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for ListAst
expectvalue /Class
doit
ExpressionAst subclass: 'ListAst'
  instVarNames: #( elts ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ListAst comment:
'https://docs.python.org/3/library/ast.html#ast.List

A list.

elts holds a list of nodes representing the elements.
ctx is Store if the container is an assignment target (i.e. (x,y)=something),
and Load otherwise.

Example:
>>> print(ast.dump(ast.parse(''[1, 2, 3]'', mode=''eval''), indent=4))
Expression(
    body=List(
        elts=[Constant(value=1), Constant(value=2), Constant(value=3)],
        ctx=Load()))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        ListAst(elts ctx)
'
%

expectvalue /Class
doit
ListAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from ListAst
removeallmethods ListAst
removeallclassmethods ListAst

set compile_env: 0

category: 'Grail-other'
method: ListAst
printSmalltalkOn: aStream

	elts isEmpty ifTrue: [
		aStream nextPutAll: '(OrderedCollection perform: #new env: 0)'.
		^self.
	].
	aStream nextPutAll: '({'.
	elts doWithIndex: [:each :i |
		i > 1 ifTrue: [aStream nextPutAll: '. '].
		each printSmalltalkOn: aStream.
	].
	aStream nextPutAll: '} perform: #asOrderedCollection env: 0)'.
%
