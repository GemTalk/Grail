! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'MiExceptionHandlerTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MiExceptionHandlerTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MiExceptionHandlerTestCase - ``except'' against a MULTIPLE-INHERITANCE base.
!
! Issue #867: on:do: resolves handlers through #handles:, which walks the single
! Smalltalk superclass chain, so a Python class's SECONDARY bases were invisible
! to ``except'' -- while issubclass and __mro__ reported them the whole time.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MiExceptionHandlerTestCase removeAllMethods.
MiExceptionHandlerTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Exception handling'
method: MiExceptionHandlerTestCase
tearDown

	importlib @env1:modules removeKey: #'mi_exception_handlers' ifAbsent: [].
	self ___forgetCanonicalModule___: 'mi_exception_handlers'.
%

category: 'Grail-Tests - Exception handling'
method: MiExceptionHandlerTestCase
testExceptMatchesAMultipleInheritanceBase
	"_pydecimal declares five exception classes with more than one base, and
	``class DivisionByZero(DecimalException, ZeroDivisionError)'' is the one that
	showed it: ``except ZeroDivisionError:'' let it escape, while ``except
	ArithmeticError:'' -- ZeroDivisionError's OWN superclass, reached through the
	primary chain -- caught it.  So the class ABOVE the one that missed matched,
	which is why this did not read as ``multiple inheritance is unsupported''.

	Every expectation in the fixture is CPython's, measured: the file is
	self-running and the fixture gate runs it under CPython on every PR.

	The MISS checks carry as much weight as the hit ones here.  A fix that
	widened #handles: without re-asking the MRO would satisfy every positive
	check in this list and start catching unrelated exceptions, and the four
	single-inheritance checks are what keep the ordinary path honest."

	| mod |
	importlib @env1:modules removeKey: #'mi_exception_handlers' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/mi_exception_handlers.py')
		name: 'mi_exception_handlers'.
	"The fixture's two INTROSPECTION checks are deliberately not in this list.
	They read __bases__ / issubclass, and those are wrong for a DEPLOYED module
	in a session that warm-bound it -- measured: after a framework deploy, a
	fresh session reads
	    decimal.DivisionByZero.__bases__      -> ('DecimalException',)
	    issubclass(.., ZeroDivisionError)     -> False
	    except ZeroDivisionError              -> catches
	The canonical restore does not re-establish the MI bases record, which is a
	separate defect in a different subsystem; asserting it here would make this
	test fail for a reason it is not about.  It is exactly why #handles: reads a
	COMMITTED map rather than the session MI registry -- the last line above is
	the one this test is for, and it holds in both states.

	The checks stay in the fixture, where the gate runs them under CPython and
	where a cold import satisfies them, so the premise is still recorded."
	#( 'except_catches_the_secondary_base'
	   'except_catches_the_primary_base'
	   'except_catches_the_primary_chain_above_it'
	   'except_catches_the_exact_class'
	   'except_catches_a_second_class_with_the_same_shape'
	   "Nothing about this is decimal-specific -- a user class with two bases
	    behaved the same way."
	   'a_user_defined_mi_exception_matches_its_secondary_base'
	   'a_user_defined_mi_exception_still_matches_its_primary_base'
	   'a_user_defined_mi_exception_still_misses_an_unrelated_class'
	   "Controls: matching must not widen into classes that share no ancestry."
	   'except_does_not_catch_an_unrelated_class'
	   'except_does_not_catch_another_unrelated_class'
	   'a_plain_zerodivisionerror_still_matches'
	   'a_plain_zerodivisionerror_still_misses_an_unrelated_class'
	   'an_unrelated_builtin_pair_still_does_not_cross_match' ) do: [:k |
		| answer |
		answer := (mod @env1:RESULTS) @env1:__getitem__: k.
		self assert: (answer = true)
			description: 'MI except check failed: ' , k , ' -> ' , answer printString]
%

category: 'Grail-Tests - Exception handling'
method: MiExceptionHandlerTestCase
testRegistrationIsPerPairAndNotAWildcard
	"BaseException's MiSecondaryBases maps ONE off-chain base to the classes that
	reach it, and #handles: answers from that pair alone.  So registering a base
	must not turn it into a catch-all: the entry says ``ZeroDivisionError reaches
	KeyError'', and nothing about ValueError.

	That is the property that makes the widening safe to state so cheaply.  A fix
	that simply made #handles: more permissive would satisfy every positive check
	in testExceptMatchesAMultipleInheritanceBase and fail here.

	Asked of #handles: directly rather than through a try/except: THIS test method
	compiles in env 0, where ``1/0'' is Smalltalk division and raises ZeroDivide
	rather than Python's ZeroDivisionError.  #handles: is also the exact protocol
	under test -- on:do: resolves every handler through it."

	| zde other |
	zde := ZeroDivisionError new.
	other := ValueError new.
	self deny: (KeyError handles: zde)
		description: 'control: unrelated before registering'.
	["Registered and then removed in an ensure:, so a later ``except KeyError:''
	 in this session is not left answering for exceptions it has nothing to do
	 with."
	 BaseException ___registerMiSecondaryBase___: KeyError for: ZeroDivisionError.
	 self assert: (KeyError handles: zde)
		description: 'the registered pair must match'.
	 self deny: (KeyError handles: other)
		description: 'registering a base must not make it catch everything']
		ensure: [BaseException ___miSecondaryBases___ ifNotNil: [:map |
			map removeKey: KeyError ifAbsent: []]].
	self deny: (KeyError handles: zde)
		description: 'and the registration is gone again'
%

category: 'Grail-Tests - Exception handling'
method: MiExceptionHandlerTestCase
testASmalltalkExceptionIsRejectedBeforeAnyLookup
	"#handles: must answer a Smalltalk exception without consulting anything:
	only a Python exception can carry Python bases, and the reject is what keeps
	a non-Grail error unwinding past Grail handlers off the slow path entirely.

	Asserted behaviourally -- an Error is not caught by a Python handler class --
	because the cost is not observable from here and the CORRECTNESS is."

	| caught |
	caught := nil.
	[[Error signal: 'plain smalltalk'] on: ZeroDivisionError do: [:ex |
		caught := #'python'. ex return: nil]]
			on: Error do: [:ex | caught ifNil: [caught := #'smalltalk']. ex return: nil].
	self assert: caught equals: #'smalltalk'
%
