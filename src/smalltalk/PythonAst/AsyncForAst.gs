! ------------------- Superclass check
run
ForAst ifNil: [self error: 'ForAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for AsyncForAst
! Inherits all fields + the standard ``printSmalltalkOn:`` codegen from
! ForAst.  Grail has no async iteration today, so ``async for`` is
! emitted as a regular ``for`` loop — the iterable is treated as if it
! were a sync iterator, matching the import-only Jinja2 / Werkzeug /
! Flask story.
expectvalue /Class
doit
ForAst subclass: 'AsyncForAst'
  instVarNames: #()
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
AsyncForAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from AsyncForAst
removeallmethods AsyncForAst
removeallclassmethods AsyncForAst
set compile_env: 0
! ------------------- Class methods for AsyncForAst
! ------------------- Instance methods for AsyncForAst
