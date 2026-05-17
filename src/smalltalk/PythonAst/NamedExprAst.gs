! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for NamedExprAst
expectvalue /Class
doit
ExpressionAst subclass: 'NamedExprAst'
  instVarNames: #( target value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
NamedExprAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from NamedExprAst
removeallmethods NamedExprAst
removeallclassmethods NamedExprAst

set compile_env: 0

category: 'Grail-other'
method: NamedExprAst
addVariableNamesTo: aStream

	target addVariableNamesTo: aStream.
%

category: 'Grail-other'
method: NamedExprAst
printSmalltalkOn: aStream

	target printSmalltalkOn: aStream.
	aStream nextPutAll: ' := '.
	value printSmalltalkOn: aStream.
%
