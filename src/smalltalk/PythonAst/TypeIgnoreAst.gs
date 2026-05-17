! ------------------- Superclass check
run
AbstractNode ifNil: [self error: 'AbstractNode is not defined. Check file ordering.'].
%

! ------------------- Class definition for TypeIgnoreAst
expectvalue /Class
doit
AbstractNode subclass: 'TypeIgnoreAst'
  instVarNames: #( lineno tag)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
TypeIgnoreAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from TypeIgnoreAst
removeallmethods TypeIgnoreAst
removeallclassmethods TypeIgnoreAst
set compile_env: 0
! ------------------- Class methods for TypeIgnoreAst
! ------------------- Instance methods for TypeIgnoreAst
