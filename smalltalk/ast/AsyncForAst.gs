! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for AsyncForAst
expectvalue /Class
doit
StatementAst subclass: 'AsyncForAst'
  instVarNames: #( target iter body
                    orelse type_comment)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
AsyncForAst comment: 
'AsyncFor(expr target, expr iter, stmt* body, stmt* orelse, string? type_comment)'
%

expectvalue /Class
doit
AsyncForAst category: 'Parser'
%

! ------------------- Remove existing behavior from AsyncForAst
removeallmethods AsyncForAst
removeallclassmethods AsyncForAst
set compile_env: 0
! ------------------- Class methods for AsyncForAst
! ------------------- Instance methods for AsyncForAst
