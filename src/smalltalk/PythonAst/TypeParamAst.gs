! ------------------- Superclass check
run
AbstractNode ifNil: [self error: 'AbstractNode is not defined. Check file ordering.'].
%

! ------------------- Class definition for TypeParamAst
expectvalue /Class
doit
AbstractNode subclass: 'TypeParamAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
TypeParamAst category: 'Parser'
%

! ------------------- Remove existing behavior from TypeParamAst
removeallmethods TypeParamAst
removeallclassmethods TypeParamAst
set compile_env: 0
! ------------------- Class methods for TypeParamAst
! ------------------- Instance methods for TypeParamAst
