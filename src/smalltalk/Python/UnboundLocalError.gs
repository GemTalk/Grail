! ------------------- Superclass check
run
NameError ifNil: [self error: 'NameError is not defined. Check file ordering.'].
%

! ------- UnboundLocalError
expectvalue /Class
doit
NameError subclass: 'UnboundLocalError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
UnboundLocalError category: 'Exceptions'
%

! ------------------- Helpers used by codegen for definite-assignment checks
set compile_env: 0

category: 'Definite-Assignment Check'
classmethod: UnboundLocalError
___checkLocal: aValue named: aSymbol
	"Codegen helper: return ``aValue`` unchanged if it is not Smalltalk nil,
	otherwise raise UnboundLocalError naming the variable. Emitted by
	NameAst's load-context codegen for any reference to a locally-declared
	Python name. The ``nil = unbound`` invariant is established by the
	Phase D audit and the singleton-None work; legitimate Python values
	never arrive as nil after that."

	aValue == nil ifTrue: [
		^ self @env1:___signal___:
			('cannot access local variable ''' , aSymbol asString ,
			 ''' where it is not associated with a value')
	].
	^ aValue
%

