! ------------------- Superclass check
run
FunctionDefAst ifNil: [self error: 'FunctionDefAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for AsyncFunctionDefAst
! Inherits all fields + the standard ``printSmalltalkOn:`` codegen from
! FunctionDefAst.  Grail has no async runtime today, so ``async def`` is
! emitted as a regular ``def``; the method body still runs synchronously
! when invoked.  Sufficient for Jinja2 / Werkzeug / Flask import-time
! parsing, where async paths are guarded behind ``is_async`` checks
! that never fire on the hello-world render path.
expectvalue /Class
doit
FunctionDefAst subclass: 'AsyncFunctionDefAst'
  instVarNames: #()
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
