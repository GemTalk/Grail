! ------------------- Superclass check
run
BaseException ifNil: [self error: 'BaseException is not defined. Check file ordering.'].
%

! ------- Exception (Python's main exception class)
expectvalue /Class
doit
BaseException subclass: 'Exception'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
Exception comment:
'Python Exception - base class for most Python exceptions.

All built-in, non-system-exiting exceptions are derived from this class.
All user-defined exceptions should also be derived from this class.
'
%

expectvalue /Class
doit
Exception category: 'Grail-Exceptions'
%

! ===============================================================================
! Exception Methods (Python 'Exception' type)
! ===============================================================================
! This file contains method implementations for the Exception class,
! which is the base class for most Python exceptions.
!
! Exception inherits from Python's BaseException and inherits most of its
! behavior. This file only adds or overrides methods specific to Exception.
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from Exception
expectvalue /Metaclass3
doit
Exception removeAllMethods: 1.
Exception class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Initialization'
method: Exception
__init__
	"Initialize with no arguments."

	self ___args___: #().
	^ None
%

category: 'Grail-Initialization'
method: Exception
__init__: a
	"Initialize with ONE positional constructor argument ``a'' -- stored as
	the 1-tuple ``(a,)'', matching CPython's ``BaseException.args'' (see
	BaseException>>__init__:)."

	a ifNil: [ self ___args___: #() ] ifNotNil: [ self ___args___: { a } ].
	^ None
%

set compile_env: 0

category: 'Grail-Exception handling'
classmethod: Exception
handles: anException
	"``except Exception:`` must catch an ExceptionGroup.  CPython's
	ExceptionGroup derives from BOTH BaseExceptionGroup and Exception
	(PEP 654); Grail's single-inheritance Smalltalk chain can only put it
	under BaseExceptionGroup, making Python's Exception and
	BaseExceptionGroup SIBLINGS under BaseException.  builtins
	___issubclass___ already widens the introspection answer, so
	``issubclass(ExceptionGroup, Exception)'' was true while ``except
	Exception:`` still let a group escape -- as an uncatchable Smalltalk
	error, since on:do: resolves handlers through THIS protocol rather
	than through issubclass.  Mirror the widening here.

	Deliberately narrow in two ways, matching CPython:
	  - only Exception ITSELF widens.  A subclass (ValueError, ...) must
	    not start catching groups, so an inherited send returns early.
	  - only ExceptionGroup, not a bare BaseExceptionGroup -- CPython
	    excludes BaseExceptionGroup from Exception too, which is what
	    keeps ``except Exception:`` from swallowing a group carrying
	    KeyboardInterrupt/SystemExit."

	| egCls |
	(super handles: anException) ifTrue: [^ true].
	"Cheap reject FIRST -- ordering here is about cost, not just correctness.
	#handles: is walked over every enclosing handler as an exception unwinds,
	and one of those unwinds is the AlmostOutOfStack that ___recursionGuard___
	converts, which arrives with almost no stack left.  Doing SymbolDictionary
	lookups on every probe was enough extra work to push that unwind into the
	Red Zone (a harder, untrappable overflow).  This reference is resolved at
	compile time, and virtually every exception is not a group at all, so the
	lookups below are now effectively unreachable on the hot path."
	(anException isKindOf: BaseExceptionGroup) ifFalse: [^ false].
	self == (Python at: #Exception otherwise: nil) ifFalse: [^ false].
	egCls := Python at: #ExceptionGroup otherwise: nil.
	^ egCls notNil and: [anException isKindOf: egCls]
%
