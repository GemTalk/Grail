"Python Exception - base class for most Python exceptions.

All built-in, non-system-exiting exceptions are derived from this class.
All user-defined exceptions should also be derived from this class.

"
Class {
	#name : 'Exception',
	#superclass : 'BaseException',
	#category : 'Grail-Exceptions'
}

{ #category : 'Grail-Exception handling' }
Exception class >> handles: anException [
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

]
