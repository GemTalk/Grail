! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for WithAst
expectvalue /Class
doit
StatementAst subclass: 'WithAst'
  instVarNames: #( items body type_comment)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
WithAst comment: 
'AsyncWith(withitem* items, stmt* body, string? type_comment)'
%

expectvalue /Class
doit
WithAst category: 'Parser'
%

! ------------------- Remove existing behavior from WithAst
removeallmethods WithAst
removeallclassmethods WithAst

set compile_env: 0

category: 'other'
method: WithAst
printSmalltalkOn: aStream

	self halt.
%
