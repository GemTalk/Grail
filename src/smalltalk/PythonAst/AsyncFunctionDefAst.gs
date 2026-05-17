! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for AsyncFunctionDefAst
expectvalue /Class
doit
StatementAst subclass: 'AsyncFunctionDefAst'
  instVarNames: #( name args body
                    decorator_list returns type_comment type_params)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
AsyncFunctionDefAst comment: 
'AsyncFunctionDef(identifier name, arguments args,
                             stmt* body, expr* decorator_list, expr? returns,
                             string? type_comment)'
%

expectvalue /Class
doit
AsyncFunctionDefAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from AsyncFunctionDefAst
removeallmethods AsyncFunctionDefAst
removeallclassmethods AsyncFunctionDefAst
set compile_env: 0
! ------------------- Class methods for AsyncFunctionDefAst
! ------------------- Instance methods for AsyncFunctionDefAst
