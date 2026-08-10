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
	"Return ``aValue`` unchanged if it is not Smalltalk nil, otherwise
	raise UnboundLocalError naming the variable.  The ``nil = unbound``
	invariant is established by the Phase D audit and the singleton-None
	work; legitimate Python values never arrive as nil after that.

	NO LONGER EMITTED BY CODEGEN.  NameAst's load-context guard now emits
	the equivalent ``(x ifNil: [UnboundLocalError ___signalUnbound___:
	#x])'', which the compiler INLINES -- see ___signalUnbound___: below.
	This method is kept as the executable statement of the invariant
	above (named by sys.gs, DeleteAst, SreTestCase and ReModuleTestCase)
	and as a hand-written guard for Smalltalk-side code.

	Defined in env-1 so a caller writes the bare
	``UnboundLocalError ___checkLocal: x named: #x'' rather than the
	noisier ``@env0:'' prefixed form.  ``=='' and ``ifTrue:'' are
	optimised selectors handled at compile time regardless of env, so
	they work as expected."

	aValue == nil ifTrue: [^ self ___signalUnbound___: aSymbol].
	^ aValue
%

category: 'Grail-Definite-Assignment Check'
classmethod: UnboundLocalError
___signalUnbound___: aSymbol
	"Codegen helper: raise UnboundLocalError naming an unbound local.
	Emitted by NameAst's load-context codegen as the failure arm of

		(x ifNil: [UnboundLocalError ___signalUnbound___: #x])

	rather than as a call to ___checkLocal:named:.  ``ifNil:'' is an
	OPTIMISED selector -- the compiler inlines it and allocates no
	BlockClosure, in env-1 exactly as in env-0 (GemStone refuses to
	compile a method FOR #ifNil: at all, which is what makes this
	safe: no env-1 override can intercept it).  So the bound case,
	which is the overwhelming majority of the ~12k emitted guards,
	costs an inline nil test instead of a real message send -- about
	5x cheaper per read, measured on 3.7.5.

	Defined in env-1 for the same reason ___checkLocal:named: is: so
	the codegen emits the bare send rather than the noisier ``@env0:''
	form.  String concat ``,'' and ``asString'' ARE overridden in
	env-1 (Python ``__add__'' / ``__str__''), so the message-text
	construction needs the explicit ``@env0:'' prefixes."

	^ self ___signal___:
		('cannot access local variable '''
			@env0:, aSymbol @env0:asString
			@env0:, ''' where it is not associated with a value')
%

! Restore the file-load default so subsequent inputs aren't accidentally
! compiled as env-1.  Only the two methods above belong in env-1.
set compile_env: 0

