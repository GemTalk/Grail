! ------------------- Superclass check
run
ModuleAst ifNil: [self error: 'ModuleAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for Package
expectvalue /Class
doit
ModuleAst subclass: 'Package'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
Package comment: 
'Packages are a way of structuring Python’s module namespace by using “dotted module names”.
See https://docs.python.org/3/tutorial/modules.html#packages for details.'
%

expectvalue /Class
doit
Package category: 'Parser'
%

! ------------------- Remove existing behavior from Package
removeallmethods Package
removeallclassmethods Package
set compile_env: 0
! ------------------- Class methods for Package
! ------------------- Instance methods for Package
