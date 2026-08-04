! ------------------- Superclass check
run
FunctionDefAst ifNil: [self error: 'FunctionDefAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for StaticFunctionDefAst
expectvalue /Class
doit
FunctionDefAst subclass: 'StaticFunctionDefAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
StaticFunctionDefAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from StaticFunctionDefAst
removeallmethods StaticFunctionDefAst
removeallclassmethods StaticFunctionDefAst
set compile_env: 0
! ------------------- Class methods for StaticFunctionDefAst
! ------------------- Instance methods for StaticFunctionDefAst

category: 'Grail-code generation'
method: StaticFunctionDefAst
___decoratorBaseIsClassSide___
	"A @staticmethod compiles onto the metaclass, taking no implicit first
	argument -- so a class-body decorator's base must be a BoundMethod on the
	class, whose receiver the method simply ignores."

	^ true
%
