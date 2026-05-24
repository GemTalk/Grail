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
UnboundLocalError category: 'Grail-Exceptions'
%

! ------------------- Helpers used by codegen for definite-assignment checks
set compile_env: 1

category: 'Grail-Definite-Assignment Check'
classmethod: UnboundLocalError
___checkLocal: aValue named: aSymbol
	"Codegen helper: return ``aValue`` unchanged if it is not Smalltalk nil,
	otherwise raise UnboundLocalError naming the variable. Emitted by
	NameAst's load-context codegen for any reference to a locally-declared
	Python name. The ``nil = unbound`` invariant is established by the
	Phase D audit and the singleton-None work; legitimate Python values
	never arrive as nil after that.

	Defined in env-1 so the codegen emits bare
	``UnboundLocalError ___checkLocal: x named: #x'' rather than the
	noisier ``@env0:'' prefixed form (~12k call sites across the
	generated stdlib).  ``=='' and ``ifTrue:'' are optimised
	selectors handled at compile time regardless of env, so they
	work as expected.  String concat ``,'' is overridden in env-1
	(Python ``__add__''), so the message-text construction uses
	the explicit ``@env0:,'' for Smalltalk concat."

	aValue == nil ifTrue: [
		^ self ___signal___:
			('cannot access local variable '''
				@env0:, aSymbol @env0:asString
				@env0:, ''' where it is not associated with a value')
	].
	^ aValue
%

! Restore the file-load default so subsequent inputs aren't accidentally
! compiled as env-1.  Only the one method above belongs in env-1.
set compile_env: 0

