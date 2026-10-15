"``functools.partialmethod' as a REAL class.

It used to be a module function returning a bare closure, which meant the
receiver was never bound: reading the attribute off an instance answered
the closure itself, so ``a.m()' called the wrapped function with the
BOUND args only and CPython's leading ``self' was simply missing --
``((), {})' where the test wanted ``((a,), {})'.  A closure also cannot
be subclassed, carry a repr, or report __isabstractmethod__.

Answers ``___pyBindsSelf___', so reading it through an INSTANCE binds
the receiver the way CPython's __get__ does.  One call shape then serves
both paths: read through the CLASS, the caller passes the receiver
explicitly in the same leading slot (``A.m(a, 5)').

NOT supported: ``partialmethod(staticmethod(f))' and
``partialmethod(classmethod(f))'.  Grail's staticmethod/classmethod are
identity stubs, so those are indistinguishable here from a plain
function, and both must bind the receiver differently (not at all, and to
the class).  test_descriptors and test_bound_method_introspection cover
exactly that and still fail."
Class {
	#name : 'functools_partialmethod',
	#superclass : 'PythonInstance',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Python Attribute Hook' }
functools_partialmethod class >> ___pythonValueAttrs___ [
	"func / args / keywords are the documented DATA attributes, and
	__isabstractmethod__ is a @property in CPython -- abc consults it with
	getattr, where a callable would test truthy whatever it wrapped."

	^ IdentitySet new
		add: #func;
		add: #args;
		add: #keywords;
		add: #'__isabstractmethod__';
		yourself

]
